/**
 * POST /api/groups/join
 *
 * 로그인 사용자가 5자리 그룹 코드로 그룹에 가입.
 * 비로그인 사용자는 이 엔드포인트를 사용하지 않고, /api/diagnosis 호출 시
 * groupCode를 함께 보내어 결과만 그룹에 연결한다 (group_members 가입 X).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { GroupRow } from '@/types/database';
import { GROUP_CODE_REGEX, normalizeGroupCode } from '@/types/sail';

interface JoinPayload {
  code?: string;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: JoinPayload;
  try {
    body = (await request.json()) as JoinPayload;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 });
  }

  const code = normalizeGroupCode(body.code ?? '');
  if (!GROUP_CODE_REGEX.test(code)) {
    return NextResponse.json(
      { error: '그룹 코드는 5자리 영숫자입니다 (예: ABCD7).' },
      { status: 400 }
    );
  }

  const svc = createServiceRoleClient();

  // 1) 코드 → 그룹 조회 (status='active' + 만료 안 됨)
  const { data: group, error: gErr } = await svc
    .from('groups')
    .select('id, max_members, status, expires_at, name')
    .eq('code', code)
    .single<Pick<GroupRow, 'id' | 'max_members' | 'status' | 'expires_at' | 'name'>>();

  if (gErr || !group) {
    return NextResponse.json(
      { error: '존재하지 않는 그룹 코드입니다.' },
      { status: 404 }
    );
  }
  if (group.status !== 'active') {
    return NextResponse.json(
      { error: '비활성 상태의 그룹입니다.' },
      { status: 400 }
    );
  }
  if (group.expires_at && new Date(group.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: '만료된 그룹 코드입니다.' },
      { status: 400 }
    );
  }

  // 2) 정원 체크
  const { count } = await svc
    .from('group_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', group.id);
  if ((count ?? 0) >= group.max_members) {
    return NextResponse.json(
      { error: '그룹 정원이 가득 찼습니다.' },
      { status: 400 }
    );
  }

  // 3) 가입 (이미 가입돼 있어도 OK — upsert)
  const { error: insErr } = await svc
    .from('group_members')
    .upsert(
      { group_id: group.id, user_id: auth.userId } as never,
      { onConflict: 'group_id,user_id', ignoreDuplicates: true }
    );

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    group: { id: group.id, name: group.name },
  });
}
