/**
 * GET /api/groups/lookup?code=ABCD7
 *
 * 비로그인 사용자가 진단 시작 전에 그룹 코드의 유효성과 그룹명을
 * 미리 확인할 수 있는 가벼운 lookup 엔드포인트.
 *
 * 반환:
 *   200 { name: string }      — 활성 그룹 발견
 *   404 { error }              — 없음/만료/비활성
 *   400 { error }              — 코드 형식 오류
 *
 * RPC resolve_group_by_code() 는 만료/비활성을 자동 필터링한다.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { GROUP_CODE_REGEX, normalizeGroupCode } from '@/types/sail';

export async function GET(request: NextRequest) {
  const codeRaw = request.nextUrl.searchParams.get('code');
  if (!codeRaw) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }
  const code = normalizeGroupCode(codeRaw);
  if (!GROUP_CODE_REGEX.test(code)) {
    return NextResponse.json({ error: 'invalid code format' }, { status: 400 });
  }

  const svc = createServiceRoleClient();
  const { data: groupId } = (await svc.rpc(
    'resolve_group_by_code' as never,
    { p_code: code } as never
  )) as { data: string | null; error: { message: string } | null };

  if (!groupId) {
    return NextResponse.json(
      { error: 'not found or expired' },
      { status: 404 }
    );
  }

  // 그룹명만 노출 (다른 필드는 보호)
  const { data: group } = await svc
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single<{ name: string }>();

  if (!group) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ name: group.name });
}
