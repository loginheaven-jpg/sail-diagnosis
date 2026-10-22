/**
 * /api/groups/[id]
 *
 * GET    — 그룹 상세 + 멤버 목록 + 결과 통계 (코치 본인/멤버/어드민)
 * PATCH  — 그룹 정보 수정, 코드 회전 가능 (코치 본인/어드민)
 * DELETE — 그룹 삭제 (코치 본인/어드민)
 */

import { NextResponse, type NextRequest } from 'next/server';

import { listAuthorizedGroupResults, securityFailure, securityJson, throttleRequest } from '@/lib/results-security';
import { groupMutationInput, readLimitedJson, recordBody, requireSameOrigin, ResultSecurityError, validUuid } from '@/lib/result-security-policy';
import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  GroupMemberRow,
  GroupRow,
  GroupUpdate,
} from '@/types/database';
import { GROUP_CODE_REGEX, generateGroupCode } from '@/types/sail';

const MAX_CODE_RETRIES = 5;

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function authorize(groupId: string) {
  const auth = await getAuthContext();
  if (!auth) return { error: '로그인이 필요합니다.', status: 401 as const };
  if (!validUuid(groupId))
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

  // A participant's membership permits their group page, never a directory of
  // other participants' names or email addresses. Only existing managers see it.
  const members = isOwner || isAdmin
    ? (await svc
      .from('group_members')
      .select('group_id, user_id, joined_at, users(nickname, email)')
      .eq('group_id', group.id)
      .order('joined_at', { ascending: false })).data
    : [];

  // 결과 목록 (이 그룹의 진단 결과)
  // The common helper independently checks actual role/group/explicit consent.
  const results = isOwner || isAdmin ? await listAuthorizedGroupResults(group.id) : [];

  return NextResponse.json({
    group,
    members: (members ?? []) as Array<
      GroupMemberRow & { users: { nickname: string | null; email: string | null } | null }
    >,
    results,
    canManage: isOwner || isAdmin,
  }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
}

// ============================================================
// PATCH — 그룹 수정 (이름/설명/정원/만료/상태/코드 회전)
// ============================================================
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    requireSameOrigin(req);
    const { id } = await ctx.params;
    const result = await authorize(id);
    if ('error' in result) return securityJson({ error: result.error }, result.status);
    const { svc, isOwner, isAdmin, auth } = result;
    if (!isOwner && !isAdmin) return securityJson({ error: '권한이 없습니다.' }, 403);
    await throttleRequest(req, 'group-update', auth.userId, 30, 600);
    const { rotateCode, ...fields } = groupMutationInput(await readLimitedJson(req, 4096));
    const update: GroupUpdate = fields;
    if (rotateCode) {
      let assigned = false;
      for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
        const code = generateGroupCode();
        if (!GROUP_CODE_REGEX.test(code)) continue;
        const { error } = await svc.from('groups').update({ ...update, code } as never).eq('id', id);
        if (!error) { assigned = true; break; }
        if (error.code !== '23505') throw new ResultSecurityError(503, '그룹을 변경하지 못했습니다.');
      }
      if (!assigned) throw new ResultSecurityError(503, '그룹 코드를 변경하지 못했습니다.');
    } else if (Object.keys(update).length) {
      const { error } = await svc.from('groups').update(update as never).eq('id', id);
      if (error) throw new ResultSecurityError(503, '그룹을 변경하지 못했습니다.');
    }
    const { data, error } = await svc.from('groups').select('*').eq('id', id).single<GroupRow>();
    if (error || !data) throw new ResultSecurityError(503, '변경한 그룹을 확인하지 못했습니다.');
    return securityJson({ group: data });
  } catch (error) { return securityFailure(error); }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    requireSameOrigin(req);
    // Existing UI sends no body; if one is supplied it must be an empty JSON object.
    if (req.body) recordBody(await readLimitedJson(req, 256), []);
    const { id } = await ctx.params;
    const result = await authorize(id);
    if ('error' in result) return securityJson({ error: result.error }, result.status);
    const { svc, isOwner, isAdmin, auth } = result;
    if (!isOwner && !isAdmin) return securityJson({ error: '권한이 없습니다.' }, 403);
    await throttleRequest(req, 'group-delete', auth.userId, 10, 600);
    const { error } = await svc.from('groups').delete().eq('id', id);
    if (error) throw new ResultSecurityError(503, '그룹을 삭제하지 못했습니다.');
    return securityJson({ ok: true });
  } catch (error) { return securityFailure(error); }
}
