/**
 * PATCH /api/admin/users/[id]
 *
 * 관리자가 특정 사용자의 role을 변경 (수동 승격 — ADR-22 옵션 A).
 * loginheaven@gmail.com의 role은 변경할 수 없다 (영구 admin).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

const UUID_REGEX = /^[0-9a-f-]{36}$/i;
const SUPERADMIN_EMAIL = 'loginheaven@gmail.com';

interface PatchPayload {
  role?: UserRole;
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: '잘못된 ID' }, { status: 400 });
  }

  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
  }

  let body: PatchPayload;
  try {
    body = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }
  if (!body.role || !['user', 'coach', 'admin'].includes(body.role)) {
    return NextResponse.json(
      { error: 'role은 user|coach|admin 중 하나여야 합니다.' },
      { status: 400 }
    );
  }

  const svc = createServiceRoleClient();

  // 슈퍼어드민 보호
  const { data: target } = await svc
    .from('users')
    .select('email, role')
    .eq('id', id)
    .single<{ email: string | null; role: UserRole }>();

  if (!target) {
    return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (target.email === SUPERADMIN_EMAIL && body.role !== 'admin') {
    return NextResponse.json(
      { error: '슈퍼어드민의 권한은 변경할 수 없습니다.' },
      { status: 400 }
    );
  }
  if (target.role === body.role) {
    return NextResponse.json({ ok: true, role: target.role, unchanged: true });
  }

  const { error } = await svc
    .from('users')
    .update({ role: body.role } as never)
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, role: body.role });
}
