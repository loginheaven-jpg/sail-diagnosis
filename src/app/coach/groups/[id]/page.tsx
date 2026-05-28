/**
 * /coach/groups/[id] — 그룹 상세 (Server Component)
 *
 * - 그룹 메타 + 가입 코드 + 회전/만료/보관 액션
 * - 멤버 목록
 * - 진단 결과 목록 + 4유형 분포 미니 차트
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { GroupDetailClient } from '@/components/coach/GroupDetailClient';
import { InvitationBlock } from '@/components/coach/InvitationBlock';
import { TypeDistribution } from '@/components/coach/TypeDistribution';
import { getAuthContext, hasMinRole } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { GroupRow, ResultRow } from '@/types/database';
import { SAIL_TYPES, type SailType } from '@/types/sail';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f-]{36}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  const auth = await getAuthContext();
  if (!auth) redirect(`/login?redirect=/coach/groups/${id}`);
  if (!hasMinRole(auth.role, 'coach')) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p className="text-center text-sail-gray-700">코치 권한이 필요합니다.</p>
      </main>
    );
  }

  const svc = createServiceRoleClient();
  const { data: groupRaw } = await svc
    .from('groups')
    .select('*')
    .eq('id', id)
    .single<GroupRow>();

  if (!groupRaw) notFound();
  const group: GroupRow = groupRaw;

  const isOwner = group.coach_id === auth.userId;
  if (!isOwner && auth.role !== 'admin') {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p className="text-center text-sail-gray-700">이 그룹에 접근할 권한이 없습니다.</p>
        <Link href="/coach" className="mt-4 block text-center text-sail-navy underline">
          ← 코치 대시보드로
        </Link>
      </main>
    );
  }

  const [{ data: members }, { data: results }] = await Promise.all([
    svc
      .from('group_members')
      .select('group_id, user_id, joined_at, users(nickname, email)')
      .eq('group_id', id)
      .order('joined_at', { ascending: false }),
    svc
      .from('results')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const memberList = (members ?? []) as Array<{
    group_id: string;
    user_id: string;
    joined_at: string;
    users: { nickname: string | null; email: string | null } | null;
  }>;
  const resultList = (results ?? []) as ResultRow[];

  // 4유형 분포
  const typeCounts: Record<SailType, number> = { S: 0, A: 0, I: 0, L: 0 };
  resultList.forEach((r) => {
    typeCounts[r.dominant_type as SailType]++;
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 md:py-12">
      <div className="flex items-center justify-between text-bodySm">
        <Link href="/coach" className="text-sail-gray-500 transition hover:text-sail-navy">
          ← 코치 대시보드
        </Link>
        <span className="text-sail-gray-400">
          {new Date(group.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          생성
        </span>
      </div>

      {/* 그룹 헤더 + 액션 */}
      <GroupDetailClient
        group={group}
        memberCount={memberList.length}
        resultCount={resultList.length}
      />

      {/* 멤버 초대 (코드 + 직링크 + 초대 메시지 + QR) */}
      <InvitationBlock group={group} />

      {/* 4유형 분포 */}
      {resultList.length > 0 && (
        <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
          <h2 className="mb-1 text-h3 font-bold text-sail-navy">4유형 분포</h2>
          <p className="mb-5 text-bodySm text-sail-gray-600">
            그룹 멤버 {resultList.length}명의 주 유형 분포
          </p>
          <TypeDistribution counts={typeCounts} total={resultList.length} />
        </section>
      )}

      {/* 결과 목록 */}
      <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
        <h2 className="mb-1 text-h3 font-bold text-sail-navy">진단 결과</h2>
        <p className="mb-5 text-bodySm text-sail-gray-600">
          최신 {Math.min(resultList.length, 100)}건 — 클릭하면 결과 페이지로 이동
        </p>
        {resultList.length === 0 ? (
          <p className="rounded-card bg-sail-gray-50 px-4 py-6 text-center text-bodySm text-sail-gray-500">
            아직 이 그룹에 들어온 진단 결과가 없습니다. 멤버에게 코드를 공유하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bodySm">
              <thead>
                <tr className="border-b border-sail-gray-200 text-left text-caption text-sail-gray-500">
                  <th className="pb-2 font-semibold">닉네임</th>
                  <th className="pb-2 font-semibold">주 유형</th>
                  <th className="pb-2 font-semibold">비율</th>
                  <th className="pb-2 font-semibold">일관성</th>
                  <th className="pb-2 font-semibold">진단일</th>
                  <th className="pb-2 font-semibold">결과</th>
                </tr>
              </thead>
              <tbody>
                {resultList.slice(0, 100).map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-sail-gray-100 hover:bg-sail-gray-50"
                  >
                    <td className="py-2.5 text-sail-gray-900">{r.nickname ?? '익명'}</td>
                    <td className="py-2.5">
                      <TypeBadge type={r.dominant_type as SailType} />
                    </td>
                    <td className="py-2.5 font-mono text-sail-gray-600">
                      {Number(r[`type_${r.dominant_type.toLowerCase()}_pct` as 'type_s_pct']).toFixed(1)}%
                    </td>
                    <td className="py-2.5 font-mono text-sail-gray-600">
                      {r.consistency_score === null
                        ? '—'
                        : `${Number(r.consistency_score).toFixed(0)}%`}
                    </td>
                    <td className="py-2.5 text-caption text-sail-gray-500">
                      {new Date(r.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5">
                      <Link
                        href={`/result/${r.id}`}
                        className="text-caption font-semibold text-sail-navy hover:underline"
                      >
                        보기 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 멤버 목록 */}
      <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
        <h2 className="mb-1 text-h3 font-bold text-sail-navy">멤버</h2>
        <p className="mb-5 text-bodySm text-sail-gray-600">
          {memberList.length}명 / 정원 {group.max_members}명
        </p>
        {memberList.length === 0 ? (
          <p className="rounded-card bg-sail-gray-50 px-4 py-6 text-center text-bodySm text-sail-gray-500">
            로그인된 멤버는 아직 없습니다. (비로그인 진단도 결과 표에 표시됩니다)
          </p>
        ) : (
          <ul className="divide-y divide-sail-gray-100">
            {memberList.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between py-2.5 text-bodySm"
              >
                <span className="text-sail-gray-900">
                  {m.users?.nickname ?? m.users?.email?.split('@')[0] ?? '익명'}
                </span>
                <span className="text-caption text-sail-gray-500">
                  {new Date(m.joined_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  가입
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function TypeBadge({ type }: { type: SailType }) {
  const info = SAIL_TYPES[type];
  const bg = `bg-sail-${type.toLowerCase()}`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-tiny font-semibold text-white ${bg}`}
    >
      <span aria-hidden>{info.emoji}</span>
      {info.koreanName}
    </span>
  );
}
