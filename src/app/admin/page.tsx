/**
 * /admin — 슈퍼어드민 대시보드 (Server Component)
 *
 * - 전체 통계 (사용자/그룹/결과 수)
 * - 코치 신청 대기 목록 (승인·거부)
 * - 사용자 목록 (검색 + 역할 변경)
 */

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

  // 통계
  const [usersCount, groupsCount, resultsCount, pendingApps, recentUsers] =
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
