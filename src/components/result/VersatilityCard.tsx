/**
 * VersatilityCard — 스타일 유연성 (Merrill-Reid 제3 개념)
 *   (Quiet Luxury v2.0 — 골드 헤어라인 강조)
 *
 * "유형에는 우열이 없지만, 유연성에는 우열이 있다"
 */

import {
  VERSATILITY_HEADLINE,
  VERSATILITY_SUBLINE,
} from '@/data/crew-matrix';
import { TYPE_PROFILES } from '@/data/type-profiles';
import { SAIL_TYPES, type SailType } from '@/types/sail';

interface VersatilityCardProps {
  dominantType: SailType;
}

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#6B3FA0',
  L: '#2E9E6B',
};

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export function VersatilityCard({ dominantType }: VersatilityCardProps) {
  const profile = TYPE_PROFILES[dominantType];

  return (
    <section
      className="relative overflow-hidden rounded-modal border p-8 md:p-11"
      style={{
        background:
          'linear-gradient(160deg, rgba(15,36,56,0.85) 0%, rgba(10,22,40,0.95) 100%)',
        borderColor: 'rgba(201,162,39,0.28)',
        boxShadow:
          '0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* 골드 라디언트 글로우 */}
      <div
        aria-hidden
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(201,162,39,0.18) 0%, transparent 70%)',
          filter: 'blur(32px)',
        }}
      />
      <div
        aria-hidden
        className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(201,162,39,0.10) 0%, transparent 70%)',
          filter: 'blur(32px)',
        }}
      />

      <div className="relative">
        {/* 헤드라인 */}
        <div className="text-center">
          <p
            className="text-sail-gold"
            style={{ ...META_LABEL, letterSpacing: '0.4em' }}
          >
            ✦ Versatility
          </p>
          <h2
            className="mt-4 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(24px, 3.4vw, 32px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
            }}
          >
            {VERSATILITY_HEADLINE}
          </h2>
          {/* 금색 헤어라인 디바이더 */}
          <div
            aria-hidden
            className="mx-auto mt-5"
            style={{
              width: 64,
              height: 1,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(201,162,39,0.6) 50%, transparent 100%)',
            }}
          />
          <p
            className="mt-5 text-sail-mist"
            style={{
              fontSize: 'clamp(14px, 1.6vw, 16px)',
              lineHeight: 1.75,
              letterSpacing: '0.005em',
            }}
          >
            {VERSATILITY_SUBLINE}
          </p>
        </div>

        {/* 3유형 팁 */}
        <div className="mt-9 space-y-4">
          <p
            className="text-sail-mist/70"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {SAIL_TYPES[dominantType].englishName}({dominantType})인 당신이 다른 유형과 소통할 때
          </p>

          {profile.versatility.map((v) => {
            const target = SAIL_TYPES[v.toward];
            const accent = TYPE_HEX[v.toward];

            return (
              <div
                key={v.toward}
                className="flex items-start gap-4 rounded-card border px-5 py-4"
                style={{
                  background: 'rgba(10,22,40,0.5)',
                  borderColor: 'rgba(232,237,242,0.08)',
                  borderLeft: `2px solid ${accent}`,
                }}
              >
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `${accent}1F`,
                    border: `1px solid ${accent}40`,
                    fontSize: 20,
                    boxShadow: `0 0 18px ${accent}33`,
                  }}
                >
                  {target.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ ...META_LABEL, color: accent }}>
                    To {target.englishName} · {v.toward}
                  </p>
                  <p
                    className="mt-1.5 text-sail-paper"
                    style={{
                      fontSize: 14,
                      lineHeight: 1.7,
                      fontWeight: 400,
                      letterSpacing: '0.005em',
                    }}
                  >
                    {v.tip}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
