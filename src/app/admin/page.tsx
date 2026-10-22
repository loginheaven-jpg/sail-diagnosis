/**
 * /admin — 슈퍼어드민 대시보드 (Server Component, Quiet Luxury v2.0)
 *
 * - 관리 통계 (사용자/그룹/내 운영 그룹 수), 결과 전체 집계는 제공하지 않음
 * - 코치 신청 대기 목록 (승인·거부)
 * - 사용자 목록 (검색 + 역할 변경)
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminClient } from '@/components/admin/AdminClient';
import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toUserProfile } from '@/lib/user-profile';
import type {
  CoachApplicationRow,
  UserRow,
  UserProfile,
} from '@/types/database';

export const dynamic = 'force-dynamic';

interface PendingApplication extends CoachApplicationRow {
  user: Pick<UserProfile, 'full_name' | 'nickname' | 'email' | 'phone'> | null;
}

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export default async function AdminPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login?redirect=/admin');
  if (auth.role !== 'admin') redirect('/');

  const svc = createServiceRoleClient();

  const [usersCount, groupsCount, pendingApps, recentUsers, myGroups] =
    await Promise.all([
      svc.from('users').select('id', { count: 'exact', head: true }),
      svc.from('groups').select('id', { count: 'exact', head: true }),
      svc
        .from('coach_applications')
        .select(
          '*, user:users!coach_applications_user_id_fkey(full_name:name, nickname, email, phone)'
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      svc
        .from('users')
        .select('id, name, nickname, email, phone, role, created_at, updated_at')
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
    ownedGroups: myGroups.count ?? 0,
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-7 px-4 py-8 md:py-12">
      <div>
        <p className="text-sail-gold" style={META_LABEL}>
          Admin
        </p>
        <h1
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.2,
          }}
        >
          관리자 대시보드
        </h1>
      </div>

      {/* 통계 카드 */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="전체 사용자" value={stats.users} />
        <StatCard label="전체 그룹" value={stats.groups} />
        <StatCard label="내 운영 그룹" value={stats.ownedGroups} />
      </section>

      {/* 관리자도 그룹을 만들 수 있다는 안내 + 진입로 */}
      <section
        className="rounded-modal border p-7"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
          borderColor: 'rgba(201,162,39,0.18)',
        }}
      >
        <div className="flex flex-wrap items-start gap-5">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(201,162,39,0.12)',
              border: '1px solid rgba(201,162,39,0.3)',
              fontSize: 18,
              boxShadow: '0 0 16px rgba(201,162,39,0.25)',
            }}
          >
            ⛵
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sail-gold" style={{ ...META_LABEL, fontSize: 10 }}>
              Coach Mode
            </p>
            <h2
              className="mt-1 font-serif text-sail-paper"
              style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.005em' }}
            >
              관리자도 그룹을 만들 수 있습니다
            </h2>
            <p
              className="mt-2 text-sail-mist"
              style={{ fontSize: 14, lineHeight: 1.7 }}
            >
              내가 운영하는 그룹{' '}
              <strong className="text-sail-paper">{myGroups.count ?? 0}개</strong>{' '}
              · 코치 대시보드에서 그룹을 만들고 5자리 코드를 발급하세요.
            </p>
          </div>
          <Link
            href="/coach"
            className="inline-flex flex-shrink-0 items-center rounded-btn transition-all duration-300 hover:-translate-y-[1px]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
              color: '#0A1628',
              fontWeight: 700,
              padding: '11px 22px',
              fontSize: 13,
              letterSpacing: '0.05em',
              boxShadow: 'var(--shadow-gold)',
              fontFamily: 'var(--font-korean)',
            }}
          >
            코치 대시보드 →
          </Link>
        </div>
      </section>

      <AdminClient
        initialPendingApps={(pendingApps.data ?? []) as PendingApplication[]}
        initialUsers={((recentUsers.data ?? []) as UserRow[]).map(toUserProfile)}
      />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-modal border p-7"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
        borderColor: 'rgba(169,187,208,0.12)',
      }}
    >
      <p className="text-sail-mist" style={{ ...META_LABEL, fontSize: 10 }}>
        {label}
      </p>
      <p
        className="mt-3 font-serif text-sail-paper"
        style={{
          fontSize: 'clamp(36px, 5vw, 48px)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {value.toLocaleString('ko-KR')}
      </p>
    </div>
  );
}
