/**
 * TypeDistribution — 4유형 분포 가로 바 차트
 */

import { SAIL_TYPES, SAIL_TYPE_LIST, type SailType } from '@/types/sail';

interface Props {
  counts: Record<SailType, number>;
  total: number;
}

const BG_CLASS: Record<SailType, string> = {
  S: 'bg-sail-s',
  A: 'bg-sail-a',
  I: 'bg-sail-i',
  L: 'bg-sail-l',
};

export function TypeDistribution({ counts, total }: Props) {
  if (total === 0) return null;
  return (
    <div className="space-y-3">
      {SAIL_TYPE_LIST.map((t) => {
        const info = SAIL_TYPES[t];
        const n = counts[t];
        const pct = total > 0 ? (n / total) * 100 : 0;
        return (
          <div key={t}>
            <div className="mb-1 flex items-baseline justify-between text-bodySm">
              <span className="text-sail-gray-800">
                <span aria-hidden className="mr-1.5">
                  {info.emoji}
                </span>
                {info.koreanName}{' '}
                <span className="text-caption text-sail-gray-500">({t}형)</span>
              </span>
              <span className="font-mono text-caption text-sail-gray-700">
                {n}명 · {pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-pill bg-sail-gray-100">
              <div
                className={`h-full rounded-pill transition-all ${BG_CLASS[t]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
