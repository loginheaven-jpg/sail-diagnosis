import type { UserProfile, UserRow } from '@/types/database';

/** Keep the existing UI contract without selecting a nonexistent DB column. */
export function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    full_name: row.name,
    nickname: row.nickname,
    phone: row.phone,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
