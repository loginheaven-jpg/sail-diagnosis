/**
 * PercentBar — 4유형 확률 분포 (Quiet Luxury v2.0)
 *
 * 가로 막대 4개. 다크 배경, 골드 액센트 + 유형 컬러는 막대에만.
 * dominantType은 골드 라벨로 표시.
 */

import {
  SAIL_TYPES,
  SAIL_TYPE_LIST,
  type SailType,
  type TypeProbabilities,
} from '@/types/sail';

interface PercentBarProps {
  probabilities: TypeProbabilities;
  dominantType: SailType;
}

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#6B3FA0',
  L: '#2E9E6B',
};

export function PercentBar({ probabilities, dominantType }: PercentBarProps) {
  return (
    <section
      className="rounded-modal border p-7 md:p-9"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
        borderColor: 'rgba(201,162,39,0.15)',
      }}
    >
      <p
        className="font-serif text-sail-gold"
        style={{
          fontSize: 11,
          letterSpacing: '0.32em',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        Distribution
      </p>
      <h2
        className="mt-2 font-serif text-sail-paper"
        style={{
          fontSize: 'clamp(22px, 2.6vw, 26px)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        네 유형 확률 분포
      </h2>
      <p
        className="mt-2 text-sail-mist/80"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        당신의 응답이 네 유형에 얼마나 가까운지 — 합계 100%
      </p>

      <div className="mt-7 space-y-5">
        {SAIL_TYPE_LIST.map((t) => {
          const info = SAIL_TYPES[t];
          const pct = probabilities[t];
          const isDominant = t === dominantType;
          const typeHex = TYPE_HEX[t];

          return (
            <div key={t}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span
                  className="flex items-baseline gap-2.5 min-w-0"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 14,
                    color: isDominant
                      ? 'var(--color-sail-paper)'
                      : 'var(--color-sail-mist)',
                  }}
                >
                  <span aria-hidden style={{ fontSize: 16 }}>
                    {info.emoji}
                  </span>
                  <span style={{ fontWeight: isDominant ? 600 : 500 }}>
                    {info.englishName}
                  </span>
                  <span
                    className="text-sail-mist/60"
                    style={{ fontSize: 12, letterSpacing: '0.05em' }}
                  >
                    {t}
                  </span>
                  {isDominant && (
                    <span
                      className="font-serif text-sail-gold"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.22em',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        marginLeft: 4,
                      }}
                    >
                      · primary
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: isDominant ? 18 : 15,
                    fontWeight: isDominant ? 600 : 400,
                    color: isDominant
                      ? 'var(--color-sail-gold)'
                      : 'var(--color-sail-mist)',
                    letterSpacing: '0.02em',
                    flexShrink: 0,
                  }}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>

              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(232,237,242,0.06)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: isDominant
                      ? `linear-gradient(90deg, ${typeHex} 0%, var(--color-sail-gold) 100%)`
                      : `linear-gradient(90deg, ${typeHex}88 0%, ${typeHex}55 100%)`,
                    transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isDominant
                      ? '0 0 12px rgba(201,162,39,0.25)'
                      : 'none',
                  }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${info.englishName} 확률 ${pct.toFixed(1)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
