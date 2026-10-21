import type { NextRequest } from 'next/server';
import { capabilityHash, newCapability, readLimitedJson, recordBody, requireSameOrigin, ResultSecurityError, SHARE_TTL_SECONDS, validUuid } from '@/lib/result-security-policy';
import { capabilityContext, ensureParticipation, getAuthorizedResult, resultRpc, securityFailure, securityJson, throttleRequest } from '@/lib/results-security';

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = recordBody(await readLimitedJson(request, 1024), ['resultId']);
    if (!validUuid(body.resultId)) throw new ResultSecurityError(400, '결과 주소를 확인해 주세요.');
    const result = await getAuthorizedResult(body.resultId);
    if (!result?.can_manage) throw new ResultSecurityError(404, '결과 또는 접근 권한을 확인할 수 없습니다.');
    const actor = await ensureParticipation(request);
    const secret = newCapability();
    const data = await resultRpc<{ expires_at: string }>('sail_create_share', {
      p_result_id: body.resultId, p_user_id: actor.userId, p_session_hash: actor.sessionHash,
      p_token_hash: capabilityHash(secret), p_ttl_seconds: SHARE_TTL_SECONDS,
    });
    if (!data?.expires_at) throw new ResultSecurityError(503, '공유 링크를 준비하지 못했습니다.');
    return securityJson({ url: `/result/${body.resultId}#share=${secret}`, expiresAt: data.expires_at });
  } catch (error) { return securityFailure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = recordBody(await readLimitedJson(request, 1024), ['resultId']);
    if (!validUuid(body.resultId)) throw new ResultSecurityError(400, '결과 주소를 확인해 주세요.');
    const actor = await capabilityContext();
    if (!actor.userId) throw new ResultSecurityError(401, '결과 공유를 변경하려면 로그인해 주세요.');
    await throttleRequest(request, 'share-revoke', actor.userId);
    await resultRpc<number>('sail_revoke_share', { p_result_id: body.resultId, p_user_id: actor.userId, p_session_hash: actor.sessionHash, p_token_hash: null });
    return securityJson({ ok: true });
  } catch (error) { return securityFailure(error); }
}
