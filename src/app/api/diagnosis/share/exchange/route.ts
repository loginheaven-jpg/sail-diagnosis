import type { NextRequest } from 'next/server';
import { capabilityHash, readLimitedJson, recordBody, requireSameOrigin, ResultSecurityError, SHARE_TTL_SECONDS, validCapability, validUuid } from '@/lib/result-security-policy';
import { actorUserId, minimalResult, putCapabilityCookie, resultRpc, securityFailure, securityJson, shareCookieName, throttleRequest } from '@/lib/results-security';

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = recordBody(await readLimitedJson(request, 1024), ['resultId', 'token']);
    if (!validUuid(body.resultId) || !validCapability(body.token)) throw new ResultSecurityError(400, '공유 링크를 확인해 주세요.');
    const userId = await actorUserId();
    await throttleRequest(request, 'share-exchange', userId, 30, 60);
    // Validate the proof independently: an unrelated login must not make an invalid proof succeed.
    const data = await resultRpc<unknown>('sail_read_result', { p_result_id: body.resultId, p_user_id: null, p_session_hash: null, p_share_hash: capabilityHash(body.token) });
    const result = minimalResult(data);
    if (!result || result.access_kind !== 'share') throw new ResultSecurityError(404, '공유 링크가 만료되었거나 접근할 수 없습니다.');
    await putCapabilityCookie(shareCookieName(body.resultId), body.token, SHARE_TTL_SECONDS);
    return securityJson({ ok: true });
  } catch (error) { return securityFailure(error); }
}
