/**
 * VersatilityCard — 스타일 유연성 메시지 (Merrill-Reid 제3 개념)
 *
 * "유형에는 우열이 없지만, 유연성에는 우열이 있다"
 * 사용자의 주 유형 → 다른 3유형과 소통할 때의 팁을 제시.
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

const TYPE_BG_CLASS: Record<SailType, string> = {
  S: 'bg-sail-s',
  A: 'bg-sail-a',
  I: 'bg-sail-i',
  L: 'bg-sail-l',
};

export function VersatilityCard({ dominantType }: VersatilityCardProps) {
  const profile = TYPE_PROFILES[dominantType];

  return (
    <section className="rounded-question bg-sail-navy p-card text-white shadow-card-hover md:p-question">
      {/* 헤드라인 */}
      <div className="mb-6 text-center md:mb-8">
        <p className="mb-2 text-bodySm font-semibold uppercase tracking-wider text-sail-orange">
          🧭 스타일 유연성 (Versatility)
        </p>
        <h2 className="text-h2 font-bold leading-tight md:text-h1">
          {VERSATILITY_HEADLINE}
        </h2>
        <p className="mt-3 text-body opacity-85">{VERSATILITY_SUBLINE}</p>
      </div>

      {/* 3유형 팁 */}
      <div className="space-y-3">
        <p className="text-bodySm font-medium opacity-80">
          {SAIL_TYPES[dominantType].koreanName}({dominantType}형)인 당신이
          다른 유형과 소통할 때 —
        </p>
        {profile.versatility.map((v) => {
          const target = SAIL_TYPES[v.toward];
          return (
            <div
              key={v.toward}
              className="flex items-start gap-3 rounded-card bg-white/10 p-4 backdrop-blur-sm"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${TYPE_BG_CLASS[v.toward]} text-xl shadow-card`}
              >
                {target.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-bodySm font-semibold text-white/90">
                  {target.koreanName} ({v.toward}형)에게는
                </p>
                <p className="mt-0.5 text-body leading-relaxed">{v.tip}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
