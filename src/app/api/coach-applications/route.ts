/**
 * /api/coach-applications
 *
 * POST — 로그인 사용자(role='user')가 코치 자기등록 신청
 * GET  — 본인 신청 이력 (어드민은 전체)
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/lib/supabase/auth';
import { isSameOriginMutation } from '@/lib/result-security-policy';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  CoachApplicationInsert,
  CoachApplicationRow,
} from '@/types/database';

interface CreatePayload {
  motivation?: string;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: '요청 출처를 확인해 주세요.' }, { status: 403 });
  }
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (auth.role !== 'user') {
    return NextResponse.json(
      { error: '이미 코치/관리자 권한이 있습니다.' },
      { status: 400 }
    );
  }

  let body: CreatePayload;
  try {
    body = (await request.json()) as CreatePayload;
  } catch {
    body = {};
  }

  const motivation = body.motivation?.trim().slice(0, 500) || null;

  const svc = createServiceRoleClient();

  // 진행 중인(pending) 신청이 있는지 확인
  const { data: existing } = await svc
    .from('coach_applications')
    .select('id, status')
    .eq('user_id', auth.userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: '이미 심사 대기 중인 신청이 있습니다.' },
      { status: 400 }
    );
  }

  const payload: CoachApplicationInsert = {
    user_id: auth.userId,
    motivation,
  };
  const { data, error } = await svc
    .from('coach_applications')
    .insert(payload as never)
    .select('*')
    .single<CoachApplicationRow>();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? '신청 생성 실패' },
      { status: 500 }
    );
  }
  return NextResponse.json({ application: data }, { status: 201 });
}

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const svc = createServiceRoleClient();
  let query = svc
    .from('coach_applications')
    .select('*, user:users!coach_applications_user_id_fkey(nickname, email)')
    .order('created_at', { ascending: false });

  if (auth.role !== 'admin') {
    query = query.eq('user_id', auth.userId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ applications: data ?? [] });
}
