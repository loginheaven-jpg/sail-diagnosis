/**
 * /auth/signout — POST
 *
 * 헤더의 로그아웃 폼 submit 시 호출. 세션 쿠키 제거 후 / 로 리다이렉트.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { requireSameOrigin } from '@/lib/result-security-policy';
import { revokeParticipation, securityFailure } from '@/lib/results-security';

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    await revokeParticipation();
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return securityFailure(error);
    const home = request.nextUrl.clone();
    home.pathname = '/';
    home.search = '';
    return NextResponse.redirect(home, { status: 303 });
  } catch (error) { return securityFailure(error); }
}
