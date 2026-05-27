/**
 * Supabase 서버 클라이언트
 *
 * Server Components, Server Actions, Route Handlers에서 사용.
 *
 * Next.js 16 변경점:
 *   - cookies()는 async 함수가 되었다. `await cookies()`가 필수.
 *   - Route Handler / Server Component에서 호출 가능.
 *
 * 보안:
 *   - Server Action에서 service role key를 사용해야 할 경우 별도 함수로 분리.
 *   - 일반 요청은 publishable/anon 키 + RLS로 충분하다.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase URL or key is missing. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component에서 set 호출 시 발생할 수 있음.
          // proxy.ts에서 세션 갱신을 처리하므로 안전하게 무시 가능.
        }
      },
    },
  });
}

/**
 * Service Role 키를 사용하는 서버 클라이언트 (RLS 우회).
 *
 * **주의**: 매우 권한 있는 클라이언트. API Route 안에서 신뢰할 수 있는 작업에만 사용.
 * 사용자 입력이 직접 영향을 미치는 쿼리에는 절대 쓰지 말 것.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase service role key is missing. Check SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  // Service role 클라이언트는 쿠키 의존성이 없으므로 stateless createServerClient 사용
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {
        /* no-op */
      },
    },
  });
}
