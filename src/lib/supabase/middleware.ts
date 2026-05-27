/**
 * Supabase Auth 세션 갱신 — proxy.ts 에서 호출
 *
 * Next.js 16 변경점:
 *   - 파일 이름은 'middleware'로 두지만, 실제 진입점은 root의 proxy.ts.
 *   - proxy.ts는 Node 런타임(edge 미지원).
 *   - request.cookies, response.cookies는 동기적 API.
 *
 * 역할:
 *   - 모든 navigation 마다 호출되어 만료된 세션 쿠키를 자동 갱신.
 *   - 인증이 필요한 경로(`/dashboard`, `/admin`)에서 미인증 사용자를 `/login`으로 리다이렉트.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from '@/types/database';

const PROTECTED_PATHS = ['/dashboard', '/admin'];
const ADMIN_ONLY_PATHS = ['/admin'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // env가 없으면 인증 흐름을 건너뜀 (빌드/프리뷰 환경 안전성)
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 세션 갱신 (만료된 토큰을 refresh)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (needsAuth && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin 권한 체크
  if (ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p)) && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: 'user' | 'coach' | 'admin' }>();

    if (!profile || profile.role !== 'admin') {
      const home = request.nextUrl.clone();
      home.pathname = '/';
      return NextResponse.redirect(home);
    }
  }

  return response;
}
