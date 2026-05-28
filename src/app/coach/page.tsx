/**
 * /coach — 코치 대시보드 (Server Component)
 *
 * - 내 그룹 목록 (어드민은 전체)
 * - 신규 그룹 생성 버튼 (client component로 모달)
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CoachDashboardClient } from '@/components/coach/CoachDashboardClient';
import { getAuthContext, hasMinRole } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { GroupRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function CoachDashboardPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login?redirect=/coach');
  }
  if (!hasMinRole(auth.role, 'coach')) {
    // user는 신청 페이지로 안내
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <div className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
          <h1 className="mb-2 text-h2 font-bold text-sail-navy">
            코치 전용 페이지입니다
          </h1>
          <p className="mb-6 text-bodySm text-sail-gray-600">
            그룹 생성·관리·결과 열람 기능은 코치 권한이 있는 사용자만 사용할 수 있습니다.
          </p>
          <Link
            href="/coach/apply"
            className="inline-flex h-11 items-center rounded-button bg-sail-orange px-5 text-body font-semibold text-white shadow-card hover:bg-sail-orange-hover"
          >
            코치 권한 신청하기 →
          </Link>
        </div>
      </main>
    );
  }

  const svc = createServiceRoleClient();
  let query = svc
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });
  if (auth.role !== 'admin') {
    query = query.eq('coach_id', auth.userId);
  }
  const { data: groups } = await query;
  const groupList = (groups ?? []) as GroupRow[];

  // 그룹별 멤버 수, 결과 수 카운트
  const stats = await Promise.all(
    groupList.map(async (g) => {
      const [memberCnt, resultCnt] = await Promise.all([
        svc
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id),
        svc
          .from('results')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id),
      ]);
      return {
        groupId: g.id,
        members: memberCnt.count ?? 0,
        results: resultCnt.count ?? 0,
      };
    })
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-caption font-medium uppercase tracking-wide text-sail-orange">
            코치 대시보드
          </p>
          <h1 className="text-h1 font-bold text-sail-gray-900">내 그룹</h1>
          <p className="mt-1 text-bodySm text-sail-gray-500">
            그룹을 만들고 멤버에게 5자리 코드를 공유하세요.
          </p>
        </div>
      </div>

      <CoachDashboardClient initialGroups={groupList} initialStats={stats} />
    </main>
  );
}
