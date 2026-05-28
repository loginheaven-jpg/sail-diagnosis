/**
 * /auth/signout — POST
 *
 * 헤더의 로그아웃 폼 submit 시 호출. 세션 쿠키 제거 후 / 로 리다이렉트.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const home = request.nextUrl.clone();
  home.pathname = '/';
  home.search = '';
  return NextResponse.redirect(home, { status: 303 });
}
