/**
 * /coach/groups/[id] — 그룹 상세 (Server Component, Quiet Luxury v2.0)
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
import { listAuthorizedGroupResults } from '@/lib/results-security';
import { getAuthContext, hasMinRole } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { GroupRow } from '@/types/database';
import { SAIL_TYPES, type SailType } from '@/types/sail';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f-]{36}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

const SECTION_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
  borderColor: 'rgba(169,187,208,0.12)',
};

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#9B7BC9',
  L: '#3DB389',
};

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  const auth = await getAuthContext();
  if (!auth) redirect(`/login?redirect=/coach/groups/${id}`);
  if (!hasMinRole(auth.role, 'coach')) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-center text-sail-mist" style={{ fontSize: 15 }}>
          코치 권한이 필요합니다.
        </p>
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-center text-sail-mist" style={{ fontSize: 15 }}>
          이 그룹에 접근할 권한이 없습니다.
        </p>
        <Link
          href="/coach"
          className="mt-4 block text-center text-sail-gold hover:text-sail-gold-soft"
          style={{ fontSize: 14, letterSpacing: '0.05em' }}
        >
          ← 코치 대시보드로
        </Link>
      </main>
    );
  }

  const [{ data: members }, results] = await Promise.all([
    svc
      .from('group_members')
      .select('group_id, user_id, joined_at, users(nickname, email)')
      .eq('group_id', id)
      .order('joined_at', { ascending: false }),
    listAuthorizedGroupResults(id),
  ]);

  const memberList = (members ?? []) as Array<{
    group_id: string;
    user_id: string;
    joined_at: string;
    users: { nickname: string | null; email: string | null } | null;
  }>;
  const resultList = results;

  const typeCounts: Record<SailType, number> = { S: 0, A: 0, I: 0, L: 0 };
  resultList.forEach((r) => {
    typeCounts[r.dominant_type as SailType]++;
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-7 px-4 py-8 md:py-12">
      <div
        className="flex items-center justify-between"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          letterSpacing: '0.15em',
        }}
      >
        <Link
          href="/coach"
          className="text-sail-mist transition-colors duration-300 hover:text-sail-gold"
        >
          ← 코치 대시보드
        </Link>
        <span className="text-sail-mist/60" style={{ letterSpacing: '0.18em' }}>
          {new Date(group.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          생성
        </span>
      </div>

      <GroupDetailClient
        group={group}
        memberCount={memberList.length}
        resultCount={resultList.length}
      />

      <InvitationBlock group={group} />

      {resultList.length > 0 && (
        <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
          <p className="text-sail-gold" style={META_LABEL}>
            Type Distribution
          </p>
          <h2
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(20px, 2.4vw, 24px)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            4유형 분포
          </h2>
          <p
            className="mt-2 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.7 }}
          >
            공유에 동의한 결과 {resultList.length}건의 주 유형 분포
          </p>
          <div className="mt-6">
            <TypeDistribution counts={typeCounts} total={resultList.length} />
          </div>
        </section>
      )}

      {/* 결과 목록 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          Results
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(20px, 2.4vw, 24px)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          진단 결과
        </h2>
        <p
          className="mt-2 text-sail-mist"
          style={{ fontSize: 14, lineHeight: 1.7 }}
        >
          공유 동의가 유효한 최신 {Math.min(resultList.length, 100)}건 — 클릭하면 결과 페이지로 이동
        </p>

        {resultList.length === 0 ? (
          <p
            className="mt-6 rounded-card border px-4 py-6 text-center text-sail-mist"
            style={{
              background: 'rgba(10,22,40,0.45)',
              borderColor: 'rgba(232,237,242,0.08)',
              fontSize: 14,
            }}
          >
            현재 열람할 수 있는 공유 동의 결과가 없습니다. 그룹 코드만으로는 결과 공유에 동의한 것으로 처리하지 않습니다.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full" style={{ fontSize: 14 }}>
              <thead>
                <tr
                  className="text-left text-sail-mist"
                  style={{
                    borderBottom: '1px solid rgba(232,237,242,0.1)',
                    ...META_LABEL,
                    fontSize: 10,
                  }}
                >
                  <th className="pb-3 font-semibold">닉네임</th>
                  <th className="pb-3 font-semibold">주 유형</th>
                  <th className="pb-3 font-semibold">비율</th>
                  <th className="pb-3 font-semibold">일관성</th>
                  <th className="pb-3 font-semibold">진단일</th>
                  <th className="pb-3 font-semibold">결과</th>
                </tr>
              </thead>
              <tbody>
                {resultList.slice(0, 100).map((r) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid rgba(232,237,242,0.05)',
                    }}
                  >
                    <td className="py-3 text-sail-paper">{r.nickname ?? '익명'}</td>
                    <td className="py-3">
                      <TypeBadge type={r.dominant_type as SailType} />
                    </td>
                    <td
                      className="py-3 text-sail-mist"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {Number(
                        r[`type_${r.dominant_type.toLowerCase()}_pct` as 'type_s_pct']
                      ).toFixed(1)}
                      %
                    </td>
                    <td
                      className="py-3 text-sail-mist"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {r.consistency_score === null
                        ? '—'
                        : `${Number(r.consistency_score).toFixed(0)}%`}
                    </td>
                    <td className="py-3 text-sail-mist/70" style={{ fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/result/${r.id}`}
                        className="text-sail-gold transition-colors duration-200 hover:text-sail-gold-soft"
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 12,
                          letterSpacing: '0.1em',
                          fontWeight: 600,
                        }}
                      >
                        VIEW →
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
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          Members
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(20px, 2.4vw, 24px)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          멤버
        </h2>
        <p
          className="mt-2 text-sail-mist"
          style={{ fontSize: 14, lineHeight: 1.7 }}
        >
          {memberList.length}명 / 정원 {group.max_members}명
        </p>
        {memberList.length === 0 ? (
          <p
            className="mt-6 rounded-card border px-4 py-6 text-center text-sail-mist"
            style={{
              background: 'rgba(10,22,40,0.45)',
              borderColor: 'rgba(232,237,242,0.08)',
              fontSize: 14,
            }}
          >
            로그인된 멤버는 아직 없습니다. (비로그인 진단도 결과 표에 표시됩니다)
          </p>
        ) : (
          <ul
            className="mt-5 divide-y"
            style={{ borderColor: 'rgba(232,237,242,0.08)' } as React.CSSProperties}
          >
            {memberList.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between py-3"
                style={{ fontSize: 14 }}
              >
                <span className="text-sail-paper">
                  {m.users?.nickname ?? m.users?.email?.split('@')[0] ?? '익명'}
                </span>
                <span
                  className="text-sail-mist/70"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 12,
                    letterSpacing: '0.08em',
                  }}
                >
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
  const accent = TYPE_HEX[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5"
      style={{
        background: `${accent}1F`,
        border: `1px solid ${accent}55`,
        color: type === 'S' ? 'var(--color-sail-paper)' : accent,
        fontFamily: 'var(--font-serif)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
      }}
    >
      <span aria-hidden style={{ fontSize: 12 }}>
        {info.emoji}
      </span>
      {type}
    </span>
  );
}
