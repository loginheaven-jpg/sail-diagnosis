/**
 * /api/groups/[id]
 *
 * GET    — 그룹 상세 + 멤버 목록 + 결과 통계 (코치 본인/멤버/어드민)
 * PATCH  — 그룹 정보 수정, 코드 회전 가능 (코치 본인/어드민)
 * DELETE — 그룹 삭제 (코치 본인/어드민)
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  GroupMemberRow,
  GroupRow,
  GroupUpdate,
  ResultRow,
} from '@/types/database';
import { GROUP_CODE_REGEX, generateGroupCode } from '@/types/sail';

const UUID_REGEX = /^[0-9a-f-]{36}$/i;
const MAX_CODE_RETRIES = 5;

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function authorize(groupId: string) {
  const auth = await getAuthContext();
  if (!auth) return { error: '로그인이 필요합니다.', status: 401 as const };
  if (!UUID_REGEX.test(groupId))
    return { error: '잘못된 그룹 ID', status: 400 as const };

  const svc = createServiceRoleClient();
  const { data: group, error } = await svc
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single<GroupRow>();

  if (error || !group)
    return { error: '그룹을 찾을 수 없습니다.', status: 404 as const };

  const isOwner = group.coach_id === auth.userId;
  const isAdmin = auth.role === 'admin';
  return { auth, group, svc, isOwner, isAdmin };
}

// ============================================================
// GET — 그룹 상세
// ============================================================
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const result = await authorize(id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { svc, group, isOwner, isAdmin, auth } = result;

  // 권한: 코치/어드민/멤버만 상세 조회 가능
  const { data: membership } = await svc
    .from('group_members')
    .select('user_id')
    .eq('group_id', group.id)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!isOwner && !isAdmin && !membership) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  // 멤버 목록
  const { data: members } = await svc
    .from('group_members')
    .select('group_id, user_id, joined_at, users(nickname, email)')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: false });

  // 결과 목록 (이 그룹의 진단 결과)
  // 코치/어드민만 결과를 본다. 일반 멤버는 멤버 목록만.
  let results: ResultRow[] = [];
  if (isOwner || isAdmin) {
    const { data: res } = await svc
      .from('results')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(500);
    results = (res ?? []) as ResultRow[];
  }

  return NextResponse.json({
    group,
    members: (members ?? []) as Array<
      GroupMemberRow & { users: { nickname: string | null; email: string | null } | null }
    >,
    results,
    canManage: isOwner || isAdmin,
  });
}

// ============================================================
// PATCH — 그룹 수정 (이름/설명/정원/만료/상태/코드 회전)
// ============================================================
interface PatchPayload {
  name?: string;
  description?: string | null;
  maxMembers?: number;
  status?: 'active' | 'archived';
  expiresAt?: string | null;
  rotateCode?: boolean;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const result = await authorize(id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { svc, isOwner, isAdmin } = result;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let body: PatchPayload;
  try {
    body = (await req.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  const update: GroupUpdate = {};

  if (body.name !== undefined) {
    const n = body.name.trim();
    if (n.length < 2 || n.length > 50) {
      return NextResponse.json(
        { error: '그룹 이름은 2~50자여야 합니다.' },
        { status: 400 }
      );
    }
    update.name = n;
  }
  if (body.description !== undefined) {
    update.description = body.description?.trim().slice(0, 500) ?? null;
  }
  if (body.maxMembers !== undefined) {
    if (body.maxMembers < 1 || body.maxMembers > 1000) {
      return NextResponse.json(
        { error: '정원은 1~1000명 범위여야 합니다.' },
        { status: 400 }
      );
    }
    update.max_members = body.maxMembers;
  }
  if (body.status !== undefined) {
    if (!['active', 'archived'].includes(body.status)) {
      return NextResponse.json({ error: '잘못된 상태값' }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.expiresAt !== undefined) {
    update.expires_at = body.expiresAt;
  }

  // 코드 회전
  if (body.rotateCode) {
    let assigned = false;
    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const code = generateGroupCode();
      if (!GROUP_CODE_REGEX.test(code)) continue;
      const { error: codeErr } = await svc
        .from('groups')
        .update({ code } as never)
        .eq('id', id);
      if (!codeErr) {
        assigned = true;
        break;
      }
      if (codeErr.code !== '23505') {
        return NextResponse.json({ error: codeErr.message }, { status: 500 });
      }
    }
    if (!assigned) {
      return NextResponse.json(
        { error: '코드 회전 실패 (충돌 누적)' },
        { status: 500 }
      );
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await svc
      .from('groups')
      .update(update as never)
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 갱신된 row 반환
  const { data: updated } = await svc
    .from('groups')
    .select('*')
    .eq('id', id)
    .single<GroupRow>();

  return NextResponse.json({ group: updated });
}

// ============================================================
// DELETE — 그룹 삭제
// ============================================================
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const result = await authorize(id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { svc, isOwner, isAdmin } = result;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { error } = await svc.from('groups').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
