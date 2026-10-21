/** Public invitation preview returns only a currently active group name. */
import type { NextRequest } from 'next/server';
import { isSameOriginMutation, ResultSecurityError, validUuid } from '@/lib/result-security-policy';
import { actorUserId, securityFailure, securityJson, throttleRequest } from '@/lib/results-security';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { GROUP_CODE_REGEX, normalizeGroupCode } from '@/types/sail';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.has('origin') && !isSameOriginMutation(request))) throw new ResultSecurityError(403, '요청 출처를 확인해 주세요.');
    if (request.nextUrl.search.length > 128 || request.nextUrl.searchParams.getAll('code').length !== 1 || [...request.nextUrl.searchParams.keys()].some((key) => key !== 'code')) throw new ResultSecurityError(400, '그룹 코드를 확인해 주세요.');
    const raw = request.nextUrl.searchParams.get('code');
    if (!raw || raw.length > 32) throw new ResultSecurityError(400, '그룹 코드를 확인해 주세요.');
    const code = normalizeGroupCode(raw);
    if (!GROUP_CODE_REGEX.test(code)) throw new ResultSecurityError(400, '그룹 코드를 확인해 주세요.');
    const actor = await actorUserId();
    await throttleRequest(request, 'group-lookup', actor, 60, 60);
    const service = createServiceRoleClient();
    const resolved = await service.rpc('resolve_group_by_code' as never, { p_code: code } as never) as unknown as { data: string | null; error: unknown };
    if (resolved.error) throw new ResultSecurityError(503, '그룹 연결을 확인하지 못했습니다.');
    if (!validUuid(resolved.data)) throw new ResultSecurityError(404, '그룹이 없거나 참여 기간이 종료되었습니다.');
    const { data, error } = await service.from('groups').select('name,status,expires_at').eq('id', resolved.data).single<{ name: string; status: string; expires_at: string | null }>();
    if (error) throw new ResultSecurityError(503, '그룹 연결을 확인하지 못했습니다.');
    if (!data || data.status !== 'active' || (data.expires_at && Date.parse(data.expires_at) <= Date.now())) throw new ResultSecurityError(404, '그룹이 없거나 참여 기간이 종료되었습니다.');
    return securityJson({ name: data.name });
  } catch (error) { return securityFailure(error); }
}
