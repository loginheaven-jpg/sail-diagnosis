/**
 * PercentBar — 4유형 확률 분포 (가로 막대)
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

const TYPE_BG_CLASS: Record<SailType, string> = {
  S: 'bg-sail-s',
  A: 'bg-sail-a',
  I: 'bg-sail-i',
  L: 'bg-sail-l',
};

export function PercentBar({ probabilities, dominantType }: PercentBarProps) {
  return (
    <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <h2 className="mb-2 text-h3 font-bold text-sail-navy">4유형 확률 분포</h2>
      <p className="mb-5 text-bodySm text-sail-gray-600">
        당신의 응답이 네 유형에 얼마나 가까운지 — 합계 100%
      </p>
      <div className="space-y-3">
        {SAIL_TYPE_LIST.map((t) => {
          const info = SAIL_TYPES[t];
          const pct = probabilities[t];
          const isDominant = t === dominantType;
          return (
            <div key={t}>
              <div className="mb-1 flex items-baseline justify-between">
                <span
                  className={`text-bodySm font-semibold ${isDominant ? 'text-sail-gray-900' : 'text-sail-gray-700'}`}
                >
                  <span aria-hidden className="mr-1.5">
                    {info.emoji}
                  </span>
                  {info.koreanName} <span className="opacity-60">({t}형)</span>
                  {isDominant && (
                    <span className="ml-2 rounded-pill bg-sail-orange-bg px-2 py-0.5 text-tiny font-semibold text-sail-orange">
                      주 유형
                    </span>
                  )}
                </span>
                <span
                  className={`font-mono text-bodySm font-semibold ${isDominant ? 'text-sail-gray-900' : 'text-sail-gray-600'}`}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-pill bg-sail-gray-100">
                <div
                  className={`h-full rounded-pill transition-all ${TYPE_BG_CLASS[t]}`}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${info.koreanName} 확률 ${pct.toFixed(1)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
