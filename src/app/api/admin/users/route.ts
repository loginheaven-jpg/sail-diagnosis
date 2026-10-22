/**
 * GET /api/admin/users
 *
 * 관리자 전용. 전체 사용자 목록 조회 (페이지네이션 + 검색).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toUserProfile } from '@/lib/user-profile';
import type { UserRow } from '@/types/database';

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();
  const role = request.nextUrl.searchParams.get('role');
  const pageRaw = Number(request.nextUrl.searchParams.get('page') ?? '1');
  const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);

  const svc = createServiceRoleClient();
  let query = svc
    .from('users')
    .select('id, name, phone, nickname, email, role, created_at, updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    query = query.or(`nickname.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (role && ['user', 'coach', 'admin'].includes(role)) {
    query = query.eq('role', role);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    users: ((data ?? []) as UserRow[]).map(toUserProfile),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
