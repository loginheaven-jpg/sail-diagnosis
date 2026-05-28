/**
 * Supabase Auth 세션 갱신 + 보호 경로 + 프로필 보완 강제
 * (proxy.ts 에서 호출)
 *
 * Next.js 16 변경점:
 *   - 파일 이름은 'middleware'로 두지만, 실제 진입점은 root의 proxy.ts.
 *   - proxy.ts는 Node 런타임(edge 미지원).
 *
 * 역할:
 *   1) 모든 navigation 마다 세션 쿠키를 자동 갱신.
 *   2) 보호 경로(/dashboard, /coach, /admin) 미인증 사용자를 /login으로.
 *   3) /admin 은 role='admin'만.
 *   4) 로그인된 사용자라도 full_name 또는 phone이 비어있으면
 *      /onboarding 으로 강제 이동 (단 /onboarding, /auth/*, /api/* 본인 경로는 제외).
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from '@/types/database';

const PROTECTED_PATHS = ['/dashboard', '/coach', '/admin'];
const ADMIN_ONLY_PATHS = ['/admin'];
const ONBOARDING_EXEMPT_PATHS = [
  '/onboarding',
  '/auth/',
  '/api/',
  '/login',
  '/signup',
  '/reset-password',
  '/_next/',
  '/favicon',
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
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

  if (!user) {
    return response;
  }

  // === 로그인 사용자 대상 검사 ===

  // 프로필 보완 강제 (full_name + phone)
  const exempt = ONBOARDING_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
  if (!exempt) {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, phone, role')
      .eq('id', user.id)
      .single<{
        full_name: string | null;
        phone: string | null;
        role: 'user' | 'coach' | 'admin';
      }>();

    if (profile && (!profile.full_name || !profile.phone)) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = '/onboarding';
      onboardingUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(onboardingUrl);
    }

    // Admin 권한 체크
    if (
      ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p)) &&
      profile?.role !== 'admin'
    ) {
      const home = request.nextUrl.clone();
      home.pathname = '/';
      return NextResponse.redirect(home);
    }
  }

  return response;
}
