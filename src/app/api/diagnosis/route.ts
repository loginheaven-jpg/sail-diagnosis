/** Creation and reads share one scoped server authorization contract. */
import type { NextRequest } from 'next/server';
import { getOrCreateGeneralGroup } from '@/lib/general-group';
import { calculateRawScores, normalize } from '@/lib/scoring/calculator';
import { calculateConsistency } from '@/lib/scoring/consistency';
import { diagnose } from '@/lib/scoring/gaussian';
import { diagnosisInput, diagnosisRequestKey, readLimitedJson, requireSameOrigin, ResultSecurityError, validUuid } from '@/lib/result-security-policy';
import { getAuthorizedResult, requireParticipation, resultRpc, securityFailure, securityJson, throttleRequest } from '@/lib/results-security';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ResultInsert } from '@/types/database';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const input = diagnosisInput(await readLimitedJson(request));
    const actor = await requireParticipation();
    await throttleRequest(request, 'diagnosis', actor.userId, 30, 60);
    let groupId: string | null = null;
    if (input.groupCode) {
      const service = createServiceRoleClient();
      const resolved = await service.rpc('resolve_group_by_code' as never, { p_code: input.groupCode } as never) as unknown as { data: string | null; error: unknown };
      if (resolved.error) throw new ResultSecurityError(503, '그룹 연결을 확인하지 못했습니다.');
      if (!validUuid(resolved.data)) throw new ResultSecurityError(400, '그룹이 없거나 참여 기간이 종료되었습니다.');
      groupId = resolved.data;
    } else {
      // Preserve assignment; general membership never implies result sharing.
      groupId = await getOrCreateGeneralGroup();
    }
    const raw = calculateRawScores(input.answers);
    const norm = normalize(raw);
    const result = diagnose(norm, calculateConsistency(input.answers));
    const payload: Omit<ResultInsert, 'user_id' | 'group_id'> = {
      nickname: input.nickname, answers: input.answers, device: input.device,
      assertiveness_raw: raw.assertivenessRaw, responsiveness_raw: raw.responsivenessRaw,
      assertiveness_norm: norm.i, responsiveness_norm: norm.s,
      type_s_pct: result.probabilities.S, type_a_pct: result.probabilities.A,
      type_i_pct: result.probabilities.I, type_l_pct: result.probabilities.L,
      dominant_type: result.dominantType, secondary_type: result.secondaryType,
      intensity: result.intensity, consistency_score: result.consistencyScore,
    };
    const id = await resultRpc<string>('sail_create_result', {
      p_session_hash: actor.sessionHash, p_request_key: diagnosisRequestKey(input),
      p_user_id: actor.userId, p_group_id: groupId, p_result: payload,
      p_share_with_coach: input.shareWithCoach,
    });
    if (!validUuid(id)) throw new ResultSecurityError(503, '결과 저장을 확인하지 못했습니다.');
    return securityJson({ id }, 201);
  } catch (error) { return securityFailure(error); }
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!validUuid(id) || [...request.nextUrl.searchParams.keys()].some((key) => key !== 'id')) throw new ResultSecurityError(400, '결과 주소를 확인해 주세요.');
    const result = await getAuthorizedResult(id);
    return result ? securityJson(result) : securityJson({ error: '결과 또는 접근 권한을 확인할 수 없습니다.' }, 404);
  } catch (error) { return securityFailure(error); }
}
