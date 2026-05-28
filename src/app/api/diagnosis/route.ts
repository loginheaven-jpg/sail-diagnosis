/**
 * /api/diagnosis — 진단 결과 저장 + 조회
 *
 * 보안 정책 (architecture.md § 10):
 *   - 클라이언트가 보낸 점수는 신뢰하지 않는다.
 *   - answers 원본만 받아 서버에서 재계산하여 저장한다.
 *   - 비로그인 사용자도 진단 가능 (RLS 정책으로 INSERT/SELECT 허용)
 */

import { NextResponse, type NextRequest } from 'next/server';

import { calculateRawScores, normalize } from '@/lib/scoring/calculator';
import { calculateConsistency } from '@/lib/scoring/consistency';
import { diagnose } from '@/lib/scoring/gaussian';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { ResultInsert } from '@/types/database';
import type { AnswerRecord } from '@/types/sail';

interface SavePayload {
  nickname?: string;
  sessionCode?: string | null;
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

  // === 서버 사이드 재계산 ===
  const raw = calculateRawScores(body.answers);
  const norm = normalize(raw);
  const consistency = calculateConsistency(body.answers);
  const result = diagnose(norm, consistency);

  // 로그인 사용자가 있으면 user_id 연결
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // 인증 실패는 무시 (비로그인 진단 허용)
  }

  // INSERT는 service role 사용 — RLS는 'true'로 열려있지만,
  // server-side 신뢰성 보장을 위해 service role로 명시적 INSERT
  const payload: ResultInsert = {
    user_id: userId,
    session_code: body.sessionCode ?? null,
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
  // NOTE: payload는 위에서 ResultInsert로 타입이 보증되어 있다.
  // supabase-js의 generic 추론이 from('results') 단계에서 깨지는 알려진 이슈가
  // 있어 insert 인자에 `as never` 캐스팅을 적용한다. 타입 안전성 손실 없음.
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
