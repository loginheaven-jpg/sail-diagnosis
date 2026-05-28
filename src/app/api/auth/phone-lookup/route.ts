/**
 * POST /api/auth/phone-lookup
 *
 * 비로그인 사용자가 /login 화면에서 전화번호 입력 후 "로그인" 클릭 시 호출.
 * 전화번호가 가입돼 있으면 그 사용자의 email을 반환 → 클라이언트가
 * supabase.auth.signInWithPassword({ email, password }) 호출.
 *
 * 가입돼 있지 않으면 exists=false 만 반환 → 클라이언트가 /signup 으로 redirect.
 *
 * 보안:
 *   - email 노출이 약간의 정보 유출이긴 하나, 전화번호는 사용자가 이미 알고
 *     있는 식별자이므로 큰 리스크는 아님.
 *   - rate limit 미적용 (Vercel Edge Middleware에서 추후 보완).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { isValidPhone, normalizePhone } from '@/lib/phone';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  let body: { phone?: string };
  try {
    body = (await request.json()) as { phone?: string };
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? '');
  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: '전화번호 형식이 올바르지 않습니다.' },
      { status: 400 }
    );
  }

  const svc = createServiceRoleClient();

  // RPC로 email 조회 (SECURITY DEFINER)
  const { data: email, error } = (await svc.rpc(
    'email_by_phone' as never,
    { p_phone: phone } as never
  )) as { data: string | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!email) {
    return NextResponse.json({ exists: false, phone });
  }

  return NextResponse.json({ exists: true, email, phone });
}
