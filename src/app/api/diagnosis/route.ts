/**
 * /api/diagnosis — 진단 결과 저장 + 조회
 *
 * 보안 정책 (architecture.md § 10):
 *   - 클라이언트가 보낸 점수는 신뢰하지 않는다.
 *   - answers 원본만 받아 서버에서 재계산하여 저장한다.
 *   - 비로그인 사용자도 진단 가능 (RLS 정책으로 INSERT 허용)
 *
 * v0.7.0 변경 (Phase 7):
 *   - body.sessionCode (자유 텍스트) → body.groupCode (5자리 영숫자)로 변경
 *   - 코드 입력 시 resolve_group_by_code() RPC로 group_id 조회
 *   - 로그인 사용자가 group_id 있는 결과를 만들면 group_members에 자동 추가
 */

import { NextResponse, type NextRequest } from 'next/server';

import { calculateRawScores, normalize } from '@/lib/scoring/calculator';
import { calculateConsistency } from '@/lib/scoring/consistency';
import { diagnose } from '@/lib/scoring/gaussian';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { ResultInsert } from '@/types/database';
import type { AnswerRecord } from '@/types/sail';
import { GROUP_CODE_REGEX, normalizeGroupCode } from '@/types/sail';

interface SavePayload {
  nickname?: string;
  /** 그룹 가입 코드 (5자리, 선택) */
  groupCode?: string | null;
  answers: AnswerRecord;
  device?: string | null;
}

/** answers JSON이 형식적으로 올바른지 가볍게 검증 */
function validateAnswers(input: unknown): input is AnswerRecord {
  if (!input || typeof input !== 'object') return false;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length === 0) return false;
  for (const [id, val] of entries) {
    if (!/^Q([1-9]|[12][0-9]|30)$/.test(id)) return false;
    const num = Number(id.slice(1));
    if (num <= 10) {
      if (typeof val !== 'string' || !['a', 'b', 'c', 'd'].includes(val)) return false;
    } else if (num <= 20) {
      if (val !== 'cardA' && val !== 'cardB') return false;
    } else {
      if (typeof val !== 'number' || val < 0 || val > 100) return false;
    }
  }
  return true;
}

export async function POST(request: NextRequest) {
  let body: SavePayload;
  try {
    body = (await request.json()) as SavePayload;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!validateAnswers(body.answers)) {
    return NextResponse.json({ error: 'invalid answers' }, { status: 400 });
  }

  // === 그룹 코드 → group_id 변환 (선택적) ===
  let groupId: string | null = null;
  if (body.groupCode) {
    const normalized = normalizeGroupCode(body.groupCode);
    if (GROUP_CODE_REGEX.test(normalized)) {
      const serviceClient = createServiceRoleClient();
      // supabase-js의 rpc<...> 추론이 generic Database를 통해서는
      // 동작하지 않는 알려진 이슈가 있어 args/응답 타입을 명시한다.
      const { data: codeData, error: codeError } = (await serviceClient.rpc(
        'resolve_group_by_code' as never,
        { p_code: normalized } as never
      )) as { data: string | null; error: { message: string } | null };
      if (codeError) {
        return NextResponse.json(
          { error: `그룹 코드 조회 실패: ${codeError.message}` },
          { status: 500 }
        );
      }
      if (!codeData) {
        return NextResponse.json(
          { error: `그룹 코드 '${normalized}' 가 존재하지 않거나 만료되었습니다.` },
          { status: 400 }
        );
      }
      groupId = codeData as string;
    }
    // 형식이 안 맞으면 코드 없이 진행 (자유 메모 사용성)
  }

  // === 서버 사이드 채점 재계산 ===
  const raw = calculateRawScores(body.answers);
  const norm = normalize(raw);
  const consistency = calculateConsistency(body.answers);
  const result = diagnose(norm, consistency);

  // 로그인 사용자 식별
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // 비로그인 — 무시
  }

  // === INSERT ===
  const payload: ResultInsert = {
    user_id: userId,
    group_id: groupId,
    nickname: body.nickname?.slice(0, 20) ?? null,
    answers: body.answers,
    assertiveness_raw: raw.assertivenessRaw,
    responsiveness_raw: raw.responsivenessRaw,
    assertiveness_norm: norm.i,
    responsiveness_norm: norm.s,
    type_s_pct: result.probabilities.S,
    type_a_pct: result.probabilities.A,
    type_i_pct: result.probabilities.I,
    type_l_pct: result.probabilities.L,
    dominant_type: result.dominantType,
    secondary_type: result.secondaryType,
    intensity: result.intensity,
    consistency_score: result.consistencyScore,
    device: body.device?.slice(0, 200) ?? null,
  };

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from('results')
    .insert(payload as never)
    .select('id')
    .single<{ id: string }>();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'insert failed' },
      { status: 500 }
    );
  }

  // === 로그인 사용자 + 그룹 결과 → group_members 자동 추가 ===
  if (userId && groupId) {
    await serviceClient
      .from('group_members')
      .upsert({ user_id: userId, group_id: groupId } as never, {
        onConflict: 'group_id,user_id',
        ignoreDuplicates: true,
      });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid id format' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
