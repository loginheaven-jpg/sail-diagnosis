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
import { createClient } from '@/lib/supabase/server';
import { diagnose } from '@/lib/scoring/gaussian';
import { SAIL_TYPES, type SailType } from '@/types/sail';
import type { ResultRow } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchResult(id: string): Promise<ResultRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as ResultRow;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchResult(id);
  if (!result) {
    return { title: '결과를 찾을 수 없습니다 · SAIL' };
  }
  const type = result.dominant_type;
  const info = SAIL_TYPES[type];
  const title = `${result.nickname ? `${result.nickname}님은 ` : ''}${info.emoji} ${info.koreanName}(${type}형) · SAIL 소통 스타일`;
  const desc = `${info.tagline} — Merrill-Reid Social Styles 기반 소통 스타일 진단 결과.`;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'website',
    },
  };
}

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const result = await fetchResult(id);

  if (!result) {
    notFound();
  }

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

      {/* 6. 선원 궁합표 */}
      <CrewMatrix dominantType={dominantType} />

      {/* 7. 스타일 유연성 (신규) */}
      <VersatilityCard dominantType={dominantType} />

      {/* 8. 결과 공유 */}
      <ShareCard
        resultId={result.id}
        dominantType={dominantType}
        nickname={result.nickname}
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
