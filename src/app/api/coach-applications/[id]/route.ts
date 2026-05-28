/**
 * PATCH /api/coach-applications/[id]
 *
 * 어드민이 코치 신청을 승인 또는 거부.
 * 승인 시 해당 사용자의 role을 'coach'로 자동 변경.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { CoachApplicationRow } from '@/types/database';

const UUID_REGEX = /^[0-9a-f-]{36}$/i;

interface ReviewPayload {
  decision: 'approve' | 'reject';
  note?: string;
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: '잘못된 ID' }, { status: 400 });
  }

  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
  }

  let body: ReviewPayload;
  try {
    body = (await request.json()) as ReviewPayload;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  if (!['approve', 'reject'].includes(body.decision)) {
    return NextResponse.json({ error: '잘못된 decision' }, { status: 400 });
  }

  const svc = createServiceRoleClient();

  // 신청 조회
  const { data: app, error: aErr } = await svc
    .from('coach_applications')
    .select('*')
    .eq('id', id)
    .single<CoachApplicationRow>();
  if (aErr || !app) {
    return NextResponse.json({ error: '신청을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (app.status !== 'pending') {
    return NextResponse.json(
      { error: '이미 처리된 신청입니다.' },
      { status: 400 }
    );
  }

  const newStatus = body.decision === 'approve' ? 'approved' : 'rejected';
  const note = body.note?.trim().slice(0, 500) ?? null;

  // 신청 갱신
  const { error: updErr } = await svc
    .from('coach_applications')
    .update({
      status: newStatus,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    } as never)
    .eq('id', id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 승인이면 사용자 role을 'coach'로 격상
  if (body.decision === 'approve') {
    const { error: roleErr } = await svc
      .from('users')
      .update({ role: 'coach' } as never)
      .eq('id', app.user_id);
    if (roleErr) {
      return NextResponse.json(
        { error: `신청은 승인됐으나 role 변경 실패: ${roleErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
