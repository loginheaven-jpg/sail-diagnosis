/**
 * TypeCard — 결과 페이지의 헤더 카드
 * 유형 색상 배경 + 아이콘 + 유형명 + 축 조합 + 한 줄 정의 + 항해 메타포
 */

import { SAIL_TYPES, type SailType } from '@/types/sail';

interface TypeCardProps {
  dominantType: SailType;
  label: string; // "명확한 S형" 같은 라벨
  nickname?: string | null;
}

const TYPE_BG_CLASS: Record<SailType, string> = {
  S: 'bg-sail-s',
  A: 'bg-sail-a',
  I: 'bg-sail-i',
  L: 'bg-sail-l',
};

export function TypeCard({ dominantType, label, nickname }: TypeCardProps) {
  const info = SAIL_TYPES[dominantType];
  return (
    <section
      className={`${TYPE_BG_CLASS[dominantType]} rounded-question p-8 text-white shadow-card-hover md:p-10`}
      aria-label="진단 결과 — 주 유형"
    >
      <div className="flex items-start gap-5 md:gap-6">
        <div
          aria-hidden
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl backdrop-blur-sm md:h-20 md:w-20 md:text-5xl"
        >
          {info.emoji}
        </div>
        <div className="min-w-0 flex-1">
          {nickname && (
            <p className="mb-1 text-bodySm font-medium opacity-80">
              {nickname}님의 항해 스타일
            </p>
          )}
          <p className="text-caption font-semibold uppercase tracking-wide opacity-80">
            {info.englishName} · {info.axisCombo}
          </p>
          <h1 className="mt-1 text-h1 font-bold md:text-display">
            {info.koreanName}
            <span className="ml-2 text-h3 font-semibold opacity-80">
              ({dominantType}형)
            </span>
          </h1>
          <p className="mt-2 text-body font-medium opacity-95 md:text-body-lg">
            {info.tagline}
          </p>
          <p className="mt-3 text-bodySm leading-relaxed opacity-85 md:text-body">
            {info.metaphor}
          </p>
          <p className="mt-5 inline-block rounded-pill bg-white/15 px-4 py-1.5 text-bodySm font-semibold backdrop-blur-sm">
            {label}
          </p>
        </div>
      </div>
    </section>
  );
}
