/**
 * /coach — 코치 대시보드 (Server Component, Quiet Luxury v2.0)
 *
 * - 내 그룹 목록 (어드민은 전체)
 * - 신규 그룹 생성 버튼 (client component로 모달)
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CoachDashboardClient } from '@/components/coach/CoachDashboardClient';
import { listAuthorizedGroupResults } from '@/lib/results-security';
import { getAuthContext, hasMinRole } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { GroupRow } from '@/types/database';

export const dynamic = 'force-dynamic';

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export default async function CoachDashboardPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect('/login?redirect=/coach');
  }
  if (!hasMinRole(auth.role, 'coach')) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <div
          className="rounded-modal border p-9"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
            borderColor: 'rgba(201,162,39,0.18)',
          }}
        >
          <p className="text-sail-gold" style={META_LABEL}>
            Coach Only
          </p>
          <h1
            className="mt-3 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(24px, 3vw, 30px)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
            }}
          >
            코치 전용 페이지입니다
          </h1>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 15, lineHeight: 1.75 }}
          >
            그룹 생성·관리·결과 열람 기능은 코치 권한이 있는 사용자만 사용할 수 있습니다.
          </p>
          <Link
            href="/coach/apply"
            className="mt-7 inline-flex items-center rounded-btn transition-all duration-300 hover:-translate-y-[1px]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
              color: '#0A1628',
              fontWeight: 700,
              padding: '13px 26px',
              fontSize: 14,
              letterSpacing: '0.04em',
              boxShadow: 'var(--shadow-gold)',
              fontFamily: 'var(--font-korean)',
            }}
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

  const stats = await Promise.all(
    groupList.map(async (g) => {
      const [memberCnt, visibleResults] = await Promise.all([
        svc
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id),
        listAuthorizedGroupResults(g.id),
      ]);
      return {
        groupId: g.id,
        members: memberCnt.count ?? 0,
        results: visibleResults.length,
      };
    })
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12">
      <div className="mb-8">
        <p className="text-sail-gold" style={META_LABEL}>
          Coach Dashboard
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
          내 그룹
        </h1>
        <p
          className="mt-2 text-sail-mist"
          style={{ fontSize: 14, lineHeight: 1.7 }}
        >
          그룹을 만들고 멤버에게 5자리 코드를 공유하세요.
        </p>
      </div>

      <CoachDashboardClient initialGroups={groupList} initialStats={stats} />
    </main>
  );
}
