import type { UserProfile, UserWithContact } from '@/types/database';

export const USER_PROFILE_SELECT = 'id, name, nickname, email, role, created_at, updated_at, user_contacts(phone)' as const;

/** Keep the existing UI contract without selecting a nonexistent DB column. */
export function toUserProfile(row: UserWithContact): UserProfile {
  return {
    id: row.id,
    full_name: row.name,
    nickname: row.nickname,
    phone: row.user_contacts?.phone ?? null,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
