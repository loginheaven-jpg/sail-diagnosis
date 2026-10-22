/**
 * /result/[id] — 진단 결과 페이지 (Server Component)
 *
 * Next.js 16: params는 Promise. await 필수.
 *
 * 컴포넌트 순서 (architecture.md § 9.5 / 컨셉 v3):
 *   1. TypeCard
 *   2. PercentBar
 *   3. CompassChart
 *   4. ProfileDetail
 *   5. CommunicationGuide   (신규)
 *   6. CrewMatrix
 *   7. VersatilityCard      (신규)
 *   8. ShareCard
 *
 * CoachingGuide는 v3에서 결과 페이지에서 제외됨 (코치 양성 교육 교재로 이전).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CommunicationGuide } from '@/components/result/CommunicationGuide';
import { CompassChart } from '@/components/result/CompassChart';
import { CrewMatrix } from '@/components/result/CrewMatrix';
import { PercentBar } from '@/components/result/PercentBar';
import { ProfileDetail } from '@/components/result/ProfileDetail';
import { ShareCard } from '@/components/result/ShareCard';
import { TypeCard } from '@/components/result/TypeCard';
import { VersatilityCard } from '@/components/result/VersatilityCard';
import { actorUserId, getAuthorizedResult } from '@/lib/results-security';
import { ShareTokenExchange } from '@/components/result/ShareTokenExchange';
import { diagnose } from '@/lib/scoring/gaussian';
import type { SailType } from '@/types/sail';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Metadata never queries a private result or includes nickname, score or type.
export const metadata: Metadata = {
  title: 'SAIL 진단 결과',
  description: '권한이 확인된 참여자만 진단 결과를 볼 수 있습니다.',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
  openGraph: { title: 'SAIL 진단 결과', description: '권한이 필요한 비공개 결과입니다.' },
};

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  if (!await actorUserId()) {
    const destination = encodeURIComponent(`/result/${id}`);
    return <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16"><section className="rounded-modal border border-sail-gold/20 p-8"><h1 className="font-serif text-2xl text-sail-paper">로그인이 필요합니다</h1><p className="mt-4 text-sm leading-7 text-sail-mist">내 진단 결과와 동의받은 공유 결과는 로그인 회원만 열람할 수 있습니다. 공유 링크로 오셨다면 로그인 후 원래 공유 링크를 다시 열어 주세요.</p><Link href={`/login?redirect=${destination}`} className="mt-6 inline-block text-sm text-sail-gold underline">로그인하고 결과 확인하기</Link></section></main>;
  }
  const result = await getAuthorizedResult(id);

  if (!result) return <ShareTokenExchange resultId={id} />;

  const dominantType = result.dominant_type as SailType;
  // 라벨은 저장돼 있지 않으므로 클라이언트와 동일한 규칙으로 재생성
  const recreated = diagnose(
    { i: Number(result.assertiveness_norm), s: Number(result.responsiveness_norm) },
    Number(result.consistency_score ?? 100)
  );
  const probabilities = {
    S: Number(result.type_s_pct),
    A: Number(result.type_a_pct),
    I: Number(result.type_i_pct),
    L: Number(result.type_l_pct),
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-7 px-4 py-7 md:py-12">
      {/* 헤더 — 홈 링크 + 진단 일시 */}
      <div
        className="flex items-center justify-between"
        style={{
          fontSize: 12,
          letterSpacing: '0.15em',
          fontFamily: 'var(--font-serif)',
        }}
      >
        <Link
          href="/"
          className="text-sail-mist transition-colors duration-300 hover:text-sail-gold"
          style={{ letterSpacing: '0.15em' }}
        >
          ← SAIL 홈
        </Link>
        <span className="text-sail-mist/60" style={{ letterSpacing: '0.2em' }}>
          {new Date(result.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* 1. 유형 카드 */}
      <TypeCard
        dominantType={dominantType}
        label={recreated.label}
        nickname={result.nickname}
      />

      {/* 2. 확률 분포 */}
      <PercentBar probabilities={probabilities} dominantType={dominantType} />

      {/* 3. 나침반 */}
      <CompassChart
        i={Number(result.assertiveness_norm)}
        s={Number(result.responsiveness_norm)}
        dominantType={dominantType}
      />

      {/* 4. 항해 프로필 */}
      <ProfileDetail dominantType={dominantType} />

      {/* 5. 소통 가이드 (신규) */}
      <CommunicationGuide dominantType={dominantType} />

      {/* 6. 선원 매칭표 */}
      <CrewMatrix dominantType={dominantType} />

      {/* 7. 스타일 유연성 (신규) */}
      <VersatilityCard dominantType={dominantType} />

      {/* 8. 결과 공유 */}
      <ShareCard
        resultId={result.id}
        dominantType={dominantType}
        nickname={result.nickname}
        canManage={result.can_manage}
        coachConsent={result.coach_consent}
        canShareWithCoach={result.can_share_with_coach}
      />

      {/* 일관성 경고 (해당 시만) */}
      {result.consistency_score !== null && Number(result.consistency_score) < 75 && (
        <div
          className="rounded-alert border-l-2 px-5 py-4"
          style={{
            background: 'rgba(232, 168, 56, 0.08)',
            borderColor: 'var(--color-sail-warning)',
            color: 'var(--color-sail-paper)',
            fontSize: 13,
            lineHeight: 1.7,
            letterSpacing: '0.01em',
          }}
        >
          <span style={{ color: 'var(--color-sail-warning)', fontWeight: 600 }}>
            ⚠ 응답 일관성 {Number(result.consistency_score).toFixed(0)}%
          </span>{' '}
          {Number(result.consistency_score) < 50
            ? '— 응답에 모순이 많아 결과 해석에 주의가 필요합니다. 직관적으로 다시 응답해 보시면 도움이 됩니다.'
            : '— 응답에 약간의 모순이 있어 결과 해석에 참고가 필요합니다.'}
        </div>
      )}

      <footer
        className="pt-8 pb-12 text-center font-serif text-sail-mist/50"
        style={{
          fontSize: 11,
          letterSpacing: '0.3em',
          fontWeight: 400,
        }}
      >
        SAIL · MERRILL-REID SOCIAL STYLES
      </footer>
    </main>
  );
}
