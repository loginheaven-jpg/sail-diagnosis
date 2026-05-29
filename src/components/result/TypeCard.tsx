/**
 * TypeCard — 결과 페이지의 헤더 카드 (Quiet Luxury v2.0)
 *
 * 다크 네이비 그라데이션 + 유형 컬러를 강조선/이모지 글로우로 절제 사용.
 * 골드 라벨 chip, 영문-우선 타이포그래피.
 */

import { SAIL_TYPES, type SailType } from '@/types/sail';

interface TypeCardProps {
  dominantType: SailType;
  label: string;
  nickname?: string | null;
}

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#6B3FA0',
  L: '#2E9E6B',
};

export function TypeCard({ dominantType, label, nickname }: TypeCardProps) {
  const info = SAIL_TYPES[dominantType];
  const accent = TYPE_HEX[dominantType];

  return (
    <section
      className="relative overflow-hidden rounded-modal border"
      aria-label="진단 결과 — 주 유형"
      style={{
        background:
          'linear-gradient(160deg, rgba(15,36,56,0.85) 0%, rgba(10,22,40,0.92) 100%)',
        borderColor: 'rgba(201,162,39,0.18)',
        boxShadow:
          '0 24px 60px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* 좌측 강조 라인 — 유형 색상 */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: 3,
          background: `linear-gradient(180deg, ${accent} 0%, transparent 100%)`,
          opacity: 0.85,
        }}
      />
      {/* 우측 상단 글로우 */}
      <div
        aria-hidden
        className="absolute -right-20 -top-20 h-60 w-60 rounded-full"
        style={{
          background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
          filter: 'blur(28px)',
        }}
      />

      <div className="relative flex items-start gap-6 p-8 md:gap-7 md:p-11">
        <div
          aria-hidden
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-4xl md:h-20 md:w-20 md:text-5xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(201,162,39,0.12) 0%, rgba(201,162,39,0.04) 100%)',
            border: '1px solid rgba(201,162,39,0.2)',
            boxShadow: `0 0 24px ${accent}33`,
          }}
        >
          {info.emoji}
        </div>

        <div className="min-w-0 flex-1">
          {nickname && (
            <p
              className="mb-2 text-sail-mist/70"
              style={{
                fontSize: 12,
                letterSpacing: '0.18em',
                fontFamily: 'var(--font-serif)',
                textTransform: 'uppercase',
              }}
            >
              {nickname}
            </p>
          )}

          <p
            className="font-serif text-sail-gold"
            style={{
              fontSize: 11,
              letterSpacing: '0.32em',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {info.axisCombo}
          </p>

          <h1
            className="mt-3 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(32px, 5vw, 44px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
              lineHeight: 1.05,
            }}
          >
            {info.englishName}
          </h1>
          <p
            className="mt-2 text-sail-mist"
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              fontWeight: 400,
              letterSpacing: '0.04em',
            }}
          >
            {info.koreanName} · {dominantType}형
          </p>

          <p
            className="mt-6 text-sail-paper/90"
            style={{
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              fontWeight: 400,
              lineHeight: 1.7,
              letterSpacing: '-0.005em',
            }}
          >
            {info.tagline}
          </p>
          <p
            className="mt-3 text-sail-mist/80"
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              letterSpacing: '0.01em',
            }}
          >
            {info.metaphor}
          </p>

          <div
            className="mt-7 inline-flex items-center rounded-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0.08) 100%)',
              border: '1px solid rgba(201,162,39,0.32)',
              padding: '6px 18px',
            }}
          >
            <span
              className="font-serif text-sail-gold"
              style={{
                fontSize: 12,
                letterSpacing: '0.18em',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
