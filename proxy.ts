/**
 * Next.js 16 Proxy (이전 버전의 middleware.ts 후속)
 *
 * - 모든 페이지 요청 직전에 실행됨
 * - Supabase Auth 세션을 자동 갱신
 * - 보호된 경로의 미인증 사용자를 /login으로 리다이렉트
 *
 * 참조: SAIL_DESIGN_SYSTEM.md, architecture.md ADR-10 (Next.js 16 채택)
 */

import { type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 경로에서 실행:
     * - _next/static (정적 자산)
     * - _next/image (이미지 최적화 결과)
     * - favicon, sitemap, robots
     * - 이미지 확장자
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
