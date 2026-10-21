/**
 * /auth/callback?code=<oauth_code>&redirect=<path>
 *
 * Supabase OAuth/매직링크 콜백 핸들러.
 * 1) code → 세션 교환
 * 2) 사용자 role 확인
 * 3) 역할 기반 자동 라우팅:
 *    - admin → /admin
 *    - coach → /coach
 *    - user → ?redirect (지정된 경우) 또는 /
 *    - 프로필(full_name/phone) 미완 → /onboarding은 proxy.ts가 강제하므로 여기서는 무시
 */

import { NextResponse, type NextRequest } from 'next/server';

import { safeInternalRedirect } from '@/lib/auth-redirect';
import { capabilityContext, revokeParticipation, securityFailure } from '@/lib/results-security';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const explicitRedirect = request.nextUrl.searchParams.get('redirect');
  const errorParam = request.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    const failUrl = request.nextUrl.clone();
    failUrl.pathname = '/login';
    failUrl.search = `?error=${encodeURIComponent('로그인을 완료하지 못했습니다. 다시 시도해 주세요.')}`;
    return NextResponse.redirect(failUrl);
  }

  if (code) {
    try {
      const previous = await capabilityContext();
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const failUrl = request.nextUrl.clone();
        failUrl.pathname = '/login';
        failUrl.search = `?error=${encodeURIComponent('로그인을 완료하지 못했습니다. 다시 시도해 주세요.')}`;
        return NextResponse.redirect(failUrl);
      }
      try {
        await revokeParticipation(previous);
      } catch (error) {
        await supabase.auth.signOut({ scope: 'local' });
        throw error;
      }
    } catch (error) { return securityFailure(error); }
  }

  // 역할 기반 라우팅
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = '/';

  if (user) {
    const svc = createServiceRoleClient();
    const { data: profile } = await svc
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: UserRole }>();

    const role = profile?.role ?? 'user';

    destination = safeInternalRedirect(explicitRedirect, role === 'admin' ? '/admin' : role === 'coach' ? '/coach' : '/');
  } else {
    destination = safeInternalRedirect(explicitRedirect);
  }

  const dest = new URL(destination, request.nextUrl.origin);

  return NextResponse.redirect(dest);
}
