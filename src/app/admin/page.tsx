/**
 * /admin — 슈퍼어드민 대시보드 (Server Component)
 *
 * - 전체 통계 (사용자/그룹/결과 수)
 * - 코치 신청 대기 목록 (승인·거부)
 * - 사용자 목록 (검색 + 역할 변경)
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminClient } from '@/components/admin/AdminClient';
import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  CoachApplicationRow,
  UserRow,
} from '@/types/database';

export const dynamic = 'force-dynamic';

interface PendingApplication extends CoachApplicationRow {
  user: Pick<UserRow, 'full_name' | 'nickname' | 'email' | 'phone'> | null;
}

export default async function AdminPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login?redirect=/admin');
  if (auth.role !== 'admin') redirect('/');

  const svc = createServiceRoleClient();

  // 통계 + 내 그룹 (어드민도 자기 그룹 가질 수 있음)
  const [usersCount, groupsCount, resultsCount, pendingApps, recentUsers, myGroups] =
    await Promise.all([
      svc.from('users').select('id', { count: 'exact', head: true }),
      svc.from('groups').select('id', { count: 'exact', head: true }),
      svc.from('results').select('id', { count: 'exact', head: true }),
      svc
        .from('coach_applications')
        .select(
          '*, user:users!coach_applications_user_id_fkey(full_name, nickname, email, phone)'
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      svc
        .from('users')
        .select('id, full_name, nickname, email, phone, role, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      svc
        .from('groups')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', auth.userId),
    ]);

  const stats = {
    users: usersCount.count ?? 0,
    groups: groupsCount.count ?? 0,
    results: resultsCount.count ?? 0,
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 md:py-12">
      <div>
        <p className="text-caption font-medium uppercase tracking-wide text-sail-orange">
          관리자
        </p>
        <h1 className="text-h1 font-bold text-sail-gray-900">관리자 대시보드</h1>
      </div>

      {/* 통계 카드 */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="전체 사용자" value={stats.users} />
        <StatCard label="전체 그룹" value={stats.groups} />
        <StatCard label="누적 진단 결과" value={stats.results} />
      </section>

      {/* 관리자도 그룹을 만들 수 있다는 안내 + 진입로 */}
      <section className="rounded-card border border-sail-navy/30 bg-sail-navy-bg p-card">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sail-navy text-xl text-white">
            ⛵
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-h4 font-bold text-sail-gray-900">
              관리자도 그룹을 만들 수 있습니다
            </h2>
            <p className="mt-1 text-bodySm text-sail-gray-700">
              내가 운영하는 그룹: <strong>{myGroups.count ?? 0}개</strong>{' '}
              · 코치 대시보드에서 그룹을 만들고 5자리 코드를 발급하세요.
            </p>
          </div>
          <Link
            href="/coach"
            className="inline-flex h-10 flex-shrink-0 items-center rounded-button bg-sail-navy px-4 text-bodySm font-semibold text-white hover:bg-sail-navy-light"
          >
            코치 대시보드 →
          </Link>
        </div>
      </section>

      <AdminClient
        initialPendingApps={(pendingApps.data ?? []) as PendingApplication[]}
        initialUsers={(recentUsers.data ?? []) as UserRow[]}
      />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <p className="text-bodySm font-medium text-sail-gray-600">{label}</p>
      <p className="mt-1 font-mono text-display font-bold text-sail-navy">
        {value.toLocaleString('ko-KR')}
      </p>
    </div>
  );
}
