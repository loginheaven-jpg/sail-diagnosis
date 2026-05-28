/**
 * CrewMatrix — 내 유형 × 4유형 협업 팁
 */

import { CREW_MATRIX } from '@/data/crew-matrix';
import {
  SAIL_TYPES,
  SAIL_TYPE_LIST,
  type SailType,
} from '@/types/sail';

interface CrewMatrixProps {
  dominantType: SailType;
}

const TYPE_TINT_CLASS: Record<SailType, string> = {
  S: 'bg-[color:var(--color-sail-s-tint)] border-[color:var(--color-sail-s)]/30',
  A: 'bg-[color:var(--color-sail-a-tint)] border-[color:var(--color-sail-a)]/30',
  I: 'bg-[color:var(--color-sail-i-tint)] border-[color:var(--color-sail-i)]/30',
  L: 'bg-[color:var(--color-sail-l-tint)] border-[color:var(--color-sail-l)]/30',
};

const TYPE_TEXT_CLASS: Record<SailType, string> = {
  S: 'text-sail-s',
  A: 'text-sail-a',
  I: 'text-sail-i',
  L: 'text-sail-l',
};

export function CrewMatrix({ dominantType }: CrewMatrixProps) {
  const myRow = CREW_MATRIX[dominantType];
  const myInfo = SAIL_TYPES[dominantType];

  return (
    <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <h2 className="mb-1 text-h3 font-bold text-sail-navy">선원 궁합표</h2>
      <p className="mb-5 text-bodySm text-sail-gray-600">
        {myInfo.koreanName}({dominantType}형)인 당신이 다른 유형과 일할 때
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {SAIL_TYPE_LIST.map((other) => {
          const otherInfo = SAIL_TYPES[other];
          const tip = myRow[other];
          const isSelf = other === dominantType;
          return (
            <div
              key={other}
              className={`rounded-card border-2 p-5 ${TYPE_TINT_CLASS[other]}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {otherInfo.emoji}
                </span>
                <h3 className={`text-h4 font-bold ${TYPE_TEXT_CLASS[other]}`}>
                  {otherInfo.koreanName} ({other}형)
                </h3>
                {isSelf && (
                  <span className="rounded-pill bg-sail-orange-bg px-2 py-0.5 text-tiny font-semibold text-sail-orange">
                    같은 유형
                  </span>
                )}
              </div>
              <dl className="space-y-2 text-bodySm text-sail-gray-800">
                <div>
                  <dt className="text-tiny font-semibold uppercase tracking-wide text-sail-gray-500">
                    시너지
                  </dt>
                  <dd className="leading-relaxed">{tip.synergy}</dd>
                </div>
                <div>
                  <dt className="text-tiny font-semibold uppercase tracking-wide text-sail-gray-500">
                    갈등 포인트
                  </dt>
                  <dd className="leading-relaxed">{tip.conflict}</dd>
                </div>
                <div className="rounded-md bg-white/60 px-3 py-2">
                  <dt className="text-tiny font-semibold uppercase tracking-wide text-sail-navy">
                    💡 팁
                  </dt>
                  <dd className="leading-relaxed font-medium">{tip.tip}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
