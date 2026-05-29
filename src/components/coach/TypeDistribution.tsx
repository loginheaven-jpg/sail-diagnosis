/**
 * TypeDistribution — 4유형 분포 가로 바 차트 (Quiet Luxury v2.0)
 */

import { SAIL_TYPES, SAIL_TYPE_LIST, type SailType } from '@/types/sail';

interface Props {
  counts: Record<SailType, number>;
  total: number;
}

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#9B7BC9',
  L: '#3DB389',
};

export function TypeDistribution({ counts, total }: Props) {
  if (total === 0) return null;
  return (
    <div className="space-y-4">
      {SAIL_TYPE_LIST.map((t) => {
        const info = SAIL_TYPES[t];
        const n = counts[t];
        const pct = total > 0 ? (n / total) * 100 : 0;
        const accent = TYPE_HEX[t];

        return (
          <div key={t}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span
                className="flex items-baseline gap-2 text-sail-paper"
                style={{ fontFamily: 'var(--font-serif)', fontSize: 14 }}
              >
                <span aria-hidden style={{ fontSize: 16 }}>
                  {info.emoji}
                </span>
                <span style={{ fontWeight: 500 }}>{info.englishName}</span>
                <span
                  className="text-sail-mist/70"
                  style={{ fontSize: 12, letterSpacing: '0.05em' }}
                >
                  {t}
                </span>
              </span>
              <span
                className="text-sail-mist"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                }}
              >
                {n}명 ·{' '}
                <span
                  style={{
                    color: 'var(--color-sail-gold)',
                    fontWeight: 600,
                  }}
                >
                  {pct.toFixed(1)}%
                </span>
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
                  background: `linear-gradient(90deg, ${accent}88 0%, ${accent} 100%)`,
                  transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
