/**
 * /api/groups
 *
 * GET  — 내 그룹 목록 (코치는 자기 그룹, 어드민은 전체)
 * POST — 새 그룹 생성 (코치/어드민)
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext, hasMinRole } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { GroupInsert, GroupRow } from '@/types/database';
import { GROUP_CODE_REGEX, generateGroupCode } from '@/types/sail';

const MAX_CODE_RETRIES = 5;

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const svc = createServiceRoleClient();

  let query = svc
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (auth.role !== 'admin') {
    query = query.eq('coach_id', auth.userId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ groups: (data ?? []) as GroupRow[] });
}

interface CreateGroupPayload {
  name?: string;
  description?: string | null;
  maxMembers?: number;
  expiresAt?: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (!hasMinRole(auth.role, 'coach')) {
    return NextResponse.json(
      { error: '코치 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  let body: CreateGroupPayload;
  try {
    body = (await request.json()) as CreateGroupPayload;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length < 2 || name.length > 50) {
    return NextResponse.json(
      { error: '그룹 이름은 2~50자여야 합니다.' },
      { status: 400 }
    );
  }
  const description = body.description?.trim().slice(0, 500) ?? null;
  const maxMembers =
    typeof body.maxMembers === 'number' &&
    body.maxMembers >= 1 &&
    body.maxMembers <= 1000
      ? body.maxMembers
      : 100;
  const expiresAt =
    typeof body.expiresAt === 'string' && body.expiresAt.length > 0
      ? body.expiresAt
      : null;

  const svc = createServiceRoleClient();

  // 코드 충돌 회피 — 최대 5회 retry
  let createdGroup: GroupRow | null = null;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateGroupCode();
    if (!GROUP_CODE_REGEX.test(code)) continue;

    const payload: GroupInsert = {
      coach_id: auth.userId,
      name,
      description,
      code,
      max_members: maxMembers,
      expires_at: expiresAt,
    };
    const { data, error } = await svc
      .from('groups')
      .insert(payload as never)
      .select('*')
      .single<GroupRow>();

    if (!error && data) {
      createdGroup = data;
      break;
    }
    if (error?.code === '23505' /* unique violation */) {
      lastError = `코드 충돌 (재시도 ${attempt + 1}/${MAX_CODE_RETRIES})`;
      continue;
    }
    return NextResponse.json(
      { error: error?.message ?? '그룹 생성 실패' },
      { status: 500 }
    );
  }

  if (!createdGroup) {
    return NextResponse.json(
      { error: lastError ?? '그룹 코드 생성에 반복 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ group: createdGroup }, { status: 201 });
}
