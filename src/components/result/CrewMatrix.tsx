/**
 * CrewMatrix — 내 유형 × 4유형 협업 팁 (Quiet Luxury v2.0)
 *  다크 네이비 카드 + 유형 컬러는 강조선·이모지 글로우로만.
 */

import { CREW_MATRIX } from '@/data/crew-matrix';
import { SAIL_TYPES, SAIL_TYPE_LIST, type SailType } from '@/types/sail';

interface CrewMatrixProps {
  dominantType: SailType;
}

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#6B3FA0',
  L: '#2E9E6B',
};

const SECTION_STYLE = {
  background:
    'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
  borderColor: 'rgba(201,162,39,0.15)',
} as const;

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export function CrewMatrix({ dominantType }: CrewMatrixProps) {
  const myRow = CREW_MATRIX[dominantType];
  const myInfo = SAIL_TYPES[dominantType];

  return (
    <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
      <p className="text-sail-gold" style={{ ...META_LABEL, letterSpacing: '0.32em' }}>
        Crew Matrix
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
        선원 궁합
      </h2>
      <p className="mt-2 text-sail-mist/80" style={{ fontSize: 14, lineHeight: 1.7 }}>
        {myInfo.englishName}({dominantType})인 당신이 다른 유형과 일할 때
      </p>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {SAIL_TYPE_LIST.map((other) => {
          const otherInfo = SAIL_TYPES[other];
          const tip = myRow[other];
          const isSelf = other === dominantType;
          const accent = TYPE_HEX[other];

          return (
            <div
              key={other}
              className="relative overflow-hidden rounded-card border px-6 py-5"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,22,40,0.55) 0%, rgba(10,22,40,0.7) 100%)',
                borderColor: 'rgba(232,237,242,0.08)',
              }}
            >
              {/* 좌측 강조 라인 */}
              <div
                aria-hidden
                className="absolute left-0 top-0 bottom-0"
                style={{
                  width: 2,
                  background: `linear-gradient(180deg, ${accent} 0%, transparent 100%)`,
                  opacity: 0.7,
                }}
              />

              <div className="mb-4 flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background: `${accent}1F`,
                    border: `1px solid ${accent}40`,
                    fontSize: 18,
                    boxShadow: `0 0 16px ${accent}33`,
                  }}
                >
                  {otherInfo.emoji}
                </span>
                <div>
                  <p style={{ ...META_LABEL, color: accent }}>
                    {otherInfo.englishName}
                  </p>
                  <h3
                    className="font-serif text-sail-paper"
                    style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}
                  >
                    {otherInfo.koreanName} · {other}
                  </h3>
                </div>
                {isSelf && (
                  <span
                    className="ml-auto font-serif text-sail-gold"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.22em',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    self
                  </span>
                )}
              </div>

              <dl className="space-y-3">
                <div>
                  <dt className="text-sail-success" style={META_LABEL}>
                    Synergy
                  </dt>
                  <dd
                    className="mt-1 text-sail-mist"
                    style={{ fontSize: 14, lineHeight: 1.7 }}
                  >
                    {tip.synergy}
                  </dd>
                </div>
                <div>
                  <dt className="text-sail-warning" style={META_LABEL}>
                    Conflict
                  </dt>
                  <dd
                    className="mt-1 text-sail-mist"
                    style={{ fontSize: 14, lineHeight: 1.7 }}
                  >
                    {tip.conflict}
                  </dd>
                </div>
                <div
                  className="rounded-md border-l-2 px-4 py-3"
                  style={{
                    background: 'rgba(201,162,39,0.06)',
                    borderColor: 'rgba(201,162,39,0.4)',
                  }}
                >
                  <dt className="text-sail-gold" style={META_LABEL}>
                    ✦ Tip
                  </dt>
                  <dd
                    className="mt-1 text-sail-paper"
                    style={{ fontSize: 14, lineHeight: 1.7, fontWeight: 500 }}
                  >
                    {tip.tip}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
