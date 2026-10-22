/**
 * GET  /api/users/me — 내 프로필
 * PATCH /api/users/me — 내 프로필 일부 갱신 (full_name, phone, nickname만)
 *
 * email/role은 PATCH로 변경 불가. role 변경은 /api/admin/users/[id] 사용.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { isValidPhone, normalizePhone } from '@/lib/phone';
import { isSameOriginMutation } from '@/lib/result-security-policy';
import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toUserProfile, USER_PROFILE_SELECT } from '@/lib/user-profile';
import type { Database, UserWithContact } from '@/types/database';

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from('users')
    .select(USER_PROFILE_SELECT)
    .eq('id', auth.userId)
    .single<UserWithContact>();
  if (error || !data) {
    return NextResponse.json(
      { error: '회원 정보를 확인하지 못했습니다.' },
      { status: 404 }
    );
  }
  return NextResponse.json({ user: toUserProfile(data) });
}

interface PatchPayload {
  full_name?: string;
  phone?: string;
  nickname?: string;
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: '요청 출처를 확인해 주세요.' }, { status: 403 });
  }
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: PatchPayload;
  try {
    body = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['full_name', 'phone', 'nickname'].includes(key)) ||
      Object.values(body).some(value => typeof value !== 'string')) {
    return NextResponse.json({ error: '이름·전화번호·닉네임만 변경할 수 있습니다.' }, { status: 400 });
  }

  const update: Database['public']['Tables']['users']['Update'] = {};
  let contactPhone: string | null | undefined;
  if (typeof body.full_name === 'string') {
    const v = body.full_name.trim();
    if (v.length < 1 || v.length > 50) {
      return NextResponse.json(
        { error: '이름은 1~50자여야 합니다.' },
        { status: 400 }
      );
    }
    update.name = v;
  }
  if (typeof body.nickname === 'string') {
    const v = body.nickname.trim();
    if (v.length > 20) {
      return NextResponse.json(
        { error: '닉네임은 20자 이내여야 합니다.' },
        { status: 400 }
      );
    }
    update.nickname = v || null!;
  }
  if (typeof body.phone === 'string') {
    const p = normalizePhone(body.phone);
    if (p.length === 0) {
      contactPhone = null;
    } else if (!isValidPhone(p)) {
      return NextResponse.json(
        { error: '전화번호 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    } else {
      // unique 충돌 사전 체크
      const svc = createServiceRoleClient();
      const { data: existing } = await svc
        .from('user_contacts')
        .select('user_id')
        .eq('phone', p)
        .neq('user_id', auth.userId)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: '이미 다른 계정에 등록된 전화번호입니다.' },
          { status: 409 }
        );
      }
      contactPhone = p;
    }
  }

  if (Object.keys(update).length === 0 && contactPhone === undefined) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const svc = createServiceRoleClient();
  if (contactPhone !== undefined) {
    const { error } = await svc.from('user_contacts').upsert({
      user_id: auth.userId, phone: contactPhone, updated_at: new Date().toISOString(),
    } as never, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ error: '전화번호를 저장하지 못했습니다.' }, { status: 500 });
  }
  if (Object.keys(update).length) {
    const { error } = await svc.from('users').update(update as never).eq('id', auth.userId);
    if (error) return NextResponse.json({ error: '회원 정보를 저장하지 못했습니다.' }, { status: 500 });
  }
  const { data, error } = await svc.from('users').select(USER_PROFILE_SELECT)
    .eq('id', auth.userId).single<UserWithContact>();
  if (error || !data) {
    return NextResponse.json({ error: '회원 정보를 저장하지 못했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ user: toUserProfile(data) });
}
