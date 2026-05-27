/**
 * Supabase 브라우저 클라이언트 ('use client' 컴포넌트에서 사용)
 *
 * - 클라이언트 컴포넌트, useEffect, 이벤트 핸들러에서 호출
 * - 익명 키(publishable) 사용 — RLS로 보호됨
 * - 신규 키 형식 우선, legacy ANON_KEY는 폴백
 */

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase URL or key is missing. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  return createBrowserClient<Database>(url, key);
}
