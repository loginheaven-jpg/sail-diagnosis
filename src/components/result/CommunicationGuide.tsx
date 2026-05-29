/**
 * CommunicationGuide — 순항하는 대화 / 좌초하는 대화
 *   (Quiet Luxury v2.0 — 다크 네이비 + 골드)
 */

import { TYPE_PROFILES } from '@/data/type-profiles';
import { SAIL_TYPES, type SailType } from '@/types/sail';

interface CommunicationGuideProps {
  dominantType: SailType;
}

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

export function CommunicationGuide({ dominantType }: CommunicationGuideProps) {
  const profile = TYPE_PROFILES[dominantType];
  const info = SAIL_TYPES[dominantType];

  return (
    <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
      <p className="text-sail-gold" style={{ ...META_LABEL, letterSpacing: '0.32em' }}>
        Communication
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
        소통 가이드
      </h2>
      <p className="mt-2 text-sail-mist/80" style={{ fontSize: 14, lineHeight: 1.7 }}>
        {info.englishName}({dominantType})인 당신과 잘 소통하는 법
      </p>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {/* 순항하는 대화 */}
        <div
          className="rounded-card border px-6 py-5"
          style={{
            background:
              'linear-gradient(135deg, rgba(46,158,107,0.10) 0%, rgba(10,22,40,0.4) 100%)',
            borderColor: 'rgba(46,158,107,0.28)',
          }}
        >
          <p className="text-sail-success" style={META_LABEL}>
            Smooth Sailing
          </p>
          <h3
            className="mt-1 font-serif text-sail-paper"
            style={{ fontSize: 16, fontWeight: 500 }}
          >
            🌤  순항하는 대화
          </h3>
          <ul className="mt-3 space-y-2.5">
            {profile.smoothTalk.map((t) => (
              <li
                key={t}
                className="flex gap-2.5 text-sail-mist"
                style={{ fontSize: 14, lineHeight: 1.7 }}
              >
                <span
                  aria-hidden
                  style={{
                    color: 'var(--color-sail-success)',
                    marginTop: 4,
                    fontSize: 6,
                  }}
                >
                  ●
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 좌초하는 대화 */}
        <div
          className="rounded-card border px-6 py-5"
          style={{
            background:
              'linear-gradient(135deg, rgba(232,168,56,0.10) 0%, rgba(10,22,40,0.4) 100%)',
            borderColor: 'rgba(232,168,56,0.28)',
          }}
        >
          <p className="text-sail-warning" style={META_LABEL}>
            Rocky Waters
          </p>
          <h3
            className="mt-1 font-serif text-sail-paper"
            style={{ fontSize: 16, fontWeight: 500 }}
          >
            🌧  좌초하는 대화
          </h3>
          <ul className="mt-3 space-y-2.5">
            {profile.rockyTalk.map((t) => (
              <li
                key={t}
                className="flex gap-2.5 text-sail-mist"
                style={{ fontSize: 14, lineHeight: 1.7 }}
              >
                <span
                  aria-hidden
                  style={{
                    color: 'var(--color-sail-warning)',
                    marginTop: 4,
                    fontSize: 6,
                  }}
                >
                  ●
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p
        className="mt-6 rounded-alert border-l-2 px-5 py-4 text-sail-mist"
        style={{
          background: 'rgba(201,162,39,0.06)',
          borderColor: 'rgba(201,162,39,0.45)',
          fontSize: 13,
          lineHeight: 1.75,
          letterSpacing: '0.005em',
        }}
      >
        <span
          className="text-sail-gold"
          style={{ fontWeight: 600, letterSpacing: '0.05em' }}
        >
          ✦ Tip
        </span>{' '}
        — 이 표를 동료·가족·친구에게 공유해 보세요. &ldquo;나는 이런 사람&rdquo;이라는 사용설명서가 됩니다.
      </p>
    </section>
  );
}
