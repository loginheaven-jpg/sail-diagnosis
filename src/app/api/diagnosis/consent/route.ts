import type { NextRequest } from 'next/server';
import { readLimitedJson, recordBody, requireSameOrigin, ResultSecurityError, validUuid } from '@/lib/result-security-policy';
import { capabilityContext, resultRpc, securityFailure, securityJson, throttleRequest } from '@/lib/results-security';

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = recordBody(await readLimitedJson(request, 1024), ['resultId', 'consent']);
    if (!validUuid(body.resultId) || typeof body.consent !== 'boolean') throw new ResultSecurityError(400, '공유 선택을 확인해 주세요.');
    const actor = await capabilityContext();
    if (!actor.userId) throw new ResultSecurityError(401, '로그인 후 공유 여부를 설정해 주세요.');
    await throttleRequest(request, 'group-consent', actor.userId);
    await resultRpc<boolean>('sail_set_group_consent', { p_result_id: body.resultId, p_user_id: actor.userId, p_session_hash: actor.sessionHash, p_consent: body.consent });
    return securityJson({ ok: true });
  } catch (error) { return securityFailure(error); }
}
