/**
 * /auth/callback?code=<oauth_code>&redirect=<path>
 *
 * Supabase OAuth/매직링크 콜백 핸들러.
 * OAuth 공급자가 ?code를 들고 이 라우트로 redirect 한다.
 * exchangeCodeForSession()으로 세션 쿠키를 발급한 뒤 원래 위치로 리다이렉트.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const redirect = request.nextUrl.searchParams.get('redirect') ?? '/';
  const errorParam = request.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    const failUrl = request.nextUrl.clone();
    failUrl.pathname = '/login';
    failUrl.search = `?error=${encodeURIComponent(errorParam)}`;
    return NextResponse.redirect(failUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failUrl = request.nextUrl.clone();
      failUrl.pathname = '/login';
      failUrl.search = `?error=${encodeURIComponent(error.message)}`;
      return NextResponse.redirect(failUrl);
    }
  }

  // 안전한 내부 경로만 허용
  const safeRedirect =
    redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
  const dest = request.nextUrl.clone();
  dest.pathname = safeRedirect;
  dest.search = '';
  return NextResponse.redirect(dest);
}
