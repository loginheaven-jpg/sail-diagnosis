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
import { groupMutationInput, readLimitedJson, requireSameOrigin, ResultSecurityError } from '@/lib/result-security-policy';
import { securityFailure, securityJson, throttleRequest } from '@/lib/results-security';

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

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const auth = await getAuthContext();
    if (!auth) return securityJson({ error: '로그인이 필요합니다.' }, 401);
    if (!hasMinRole(auth.role, 'coach')) return securityJson({ error: '코치 권한이 필요합니다.' }, 403);
    await throttleRequest(request, 'group-create', auth.userId, 20, 600);
    const { rotateCode: _rotateCode, ...input } = groupMutationInput(await readLimitedJson(request, 4096), true);
    void _rotateCode;
    const svc = createServiceRoleClient();
    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const code = generateGroupCode();
      if (!GROUP_CODE_REGEX.test(code)) continue;
      const payload: GroupInsert = {
        coach_id: auth.userId,
        name: input.name!,
        description: input.description ?? null,
        max_members: input.max_members ?? 100,
        expires_at: input.expires_at ?? null,
        code,
      };
      const { data, error } = await svc.from('groups').insert(payload as never).select('*').single<GroupRow>();
      if (!error && data) return securityJson({ group: data }, 201);
      if (error?.code !== '23505') throw new ResultSecurityError(503, '그룹을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw new ResultSecurityError(503, '그룹 코드를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  } catch (error) { return securityFailure(error); }
}
