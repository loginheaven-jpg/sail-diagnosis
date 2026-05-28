/**
 * 서버 측 인증/권한 헬퍼
 *
 * API Route에서 공통으로 사용하는 권한 체크.
 */

import { createClient } from './server';

import type { UserRole } from '@/types/database';

export interface AuthContext {
  userId: string;
  role: UserRole;
  email: string | null;
}

/**
 * 현재 요청의 인증된 사용자를 반환. 미인증이면 null.
 * users 테이블의 role도 함께 조회한다.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .single<{ role: UserRole; email: string | null }>();

  return {
    userId: user.id,
    role: profile?.role ?? 'user',
    email: profile?.email ?? user.email ?? null,
  };
}

/** role이 기준 이상인지 확인 (admin > coach > user) */
const ROLE_RANK: Record<UserRole, number> = { user: 0, coach: 1, admin: 2 };

export function hasMinRole(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
