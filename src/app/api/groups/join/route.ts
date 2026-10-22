/** Join only by a validated code; status/capacity/idempotency are one DB transaction. */
import type { NextRequest } from 'next/server';
import { readLimitedJson, recordBody, requireSameOrigin, ResultSecurityError, validUuid } from '@/lib/result-security-policy';
import { actorUserId, resultRpc, securityFailure, securityJson, throttleRequest } from '@/lib/results-security';
import { GROUP_CODE_REGEX, normalizeGroupCode } from '@/types/sail';

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = recordBody(await readLimitedJson(request, 512), ['code']);
    if (typeof body.code !== 'string' || body.code.length > 32) throw new ResultSecurityError(400, '그룹 코드를 확인해 주세요.');
    const code = normalizeGroupCode(body.code);
    if (!GROUP_CODE_REGEX.test(code)) throw new ResultSecurityError(400, '그룹 코드를 확인해 주세요.');
    const userId = await actorUserId();
    if (!userId) throw new ResultSecurityError(401, '로그인이 필요합니다.');
    await throttleRequest(request, 'group-join', userId, 20, 60);
    const group = await resultRpc<{ id: string; name: string }>('sail_join_group', { p_code: code, p_user_id: userId });
    if (!group || !validUuid(group.id) || typeof group.name !== 'string') throw new ResultSecurityError(404, '그룹을 확인할 수 없습니다.');
    return securityJson({ ok: true, group: { id: group.id, name: group.name } });
  } catch (error) { return securityFailure(error); }
}
