/**
 * ProfileDetail — 강점·그림자·순풍·역풍·핵심 동기·대표 문장·항해 속 모습
 *  (Quiet Luxury v2.0 — 다크 네이비 + 골드)
 */

import { TYPE_PROFILES } from '@/data/type-profiles';
import { SAIL_TYPES, type SailType } from '@/types/sail';

interface ProfileDetailProps {
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

const INNER_BOX_STYLE = {
  background: 'rgba(10,22,40,0.45)',
  borderColor: 'rgba(232,237,242,0.08)',
} as const;

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export function ProfileDetail({ dominantType }: ProfileDetailProps) {
  const profile = TYPE_PROFILES[dominantType];
  const info = SAIL_TYPES[dominantType];
  const accent = TYPE_HEX[dominantType];

  return (
    <section
      className="rounded-modal border p-7 md:p-9"
      style={SECTION_STYLE}
    >
      <p
        className="text-sail-gold"
        style={{ ...META_LABEL, letterSpacing: '0.32em' }}
      >
        Voyage Profile
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
        항해 프로필
      </h2>
      <p
        className="mt-2 text-sail-mist/80"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        {info.englishName}({dominantType})이 잘 작동할 때와 흔들릴 때
      </p>

      {/* 핵심 동기 + 대표 문장 */}
      <div
        className="mt-7 rounded-card border-l-2 px-6 py-5"
        style={{
          background: `linear-gradient(135deg, ${accent}12 0%, ${accent}04 100%)`,
          borderColor: accent,
        }}
      >
        <p style={{ ...META_LABEL, color: accent }}>Core Motive</p>
        <p
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '-0.005em',
            lineHeight: 1.4,
          }}
        >
          {profile.coreMotive}
        </p>
        <p
          className="mt-3 font-serif italic text-sail-mist"
          style={{ fontSize: 15, lineHeight: 1.7 }}
        >
          &ldquo;{profile.signaturePhrase}&rdquo;
        </p>
      </div>

      {/* 강점·그림자 2단 */}
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <div
          className="rounded-card border px-6 py-5"
          style={INNER_BOX_STYLE}
        >
          <p
            className="text-sail-gold"
            style={META_LABEL}
          >
            Strengths
          </p>
          <h3
            className="mt-1 font-serif text-sail-paper"
            style={{ fontSize: 16, fontWeight: 500 }}
          >
            강점
          </h3>
          <ul className="mt-3 space-y-2">
            {profile.strengths.map((s) => (
              <li
                key={s}
                className="flex gap-2.5 text-sail-mist"
                style={{ fontSize: 14, lineHeight: 1.65 }}
              >
                <span
                  aria-hidden
                  className="text-sail-gold"
                  style={{ marginTop: 4, fontSize: 6 }}
                >
                  ●
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-card border px-6 py-5"
          style={INNER_BOX_STYLE}
        >
          <p
            className="text-sail-mist/70"
            style={META_LABEL}
          >
            Shadows
          </p>
          <h3
            className="mt-1 font-serif text-sail-paper"
            style={{ fontSize: 16, fontWeight: 500 }}
          >
            그림자
          </h3>
          <ul className="mt-3 space-y-2">
            {profile.shadows.map((s) => (
              <li
                key={s}
                className="flex gap-2.5 text-sail-mist"
                style={{ fontSize: 14, lineHeight: 1.65 }}
              >
                <span
                  aria-hidden
                  className="text-sail-mist/50"
                  style={{ marginTop: 4, fontSize: 6 }}
                >
                  ●
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 순풍 · 역풍 */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div
          className="rounded-card border px-6 py-5"
          style={INNER_BOX_STYLE}
        >
          <p
            className="text-sail-success"
            style={META_LABEL}
          >
            Fair Wind
          </p>
          <h3
            className="mt-1 font-serif text-sail-paper"
            style={{ fontSize: 15, fontWeight: 500 }}
          >
            순풍 — 잘 작동할 때
          </h3>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.75 }}
          >
            {profile.fairWind}
          </p>
        </div>

        <div
          className="rounded-card border px-6 py-5"
          style={INNER_BOX_STYLE}
        >
          <p
            className="text-sail-warning"
            style={META_LABEL}
          >
            Head Wind
          </p>
          <h3
            className="mt-1 font-serif text-sail-paper"
            style={{ fontSize: 15, fontWeight: 500 }}
          >
            역풍 — 스트레스 받을 때
          </h3>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.75 }}
          >
            {profile.headWind}
          </p>
        </div>
      </div>

      {/* 항해 속 모습 */}
      <div
        className="mt-5 rounded-card border px-6 py-5"
        style={{
          background:
            'linear-gradient(135deg, rgba(30,58,95,0.35) 0%, rgba(10,22,40,0.5) 100%)',
          borderColor: 'rgba(201,162,39,0.18)',
        }}
      >
        <p
          className="text-sail-gold"
          style={META_LABEL}
        >
          In Voyage
        </p>
        <h3
          className="mt-1 font-serif text-sail-paper"
          style={{ fontSize: 15, fontWeight: 500 }}
        >
          ⛵ 항해 속 모습
        </h3>
        <p
          className="mt-3 text-sail-mist"
          style={{ fontSize: 14, lineHeight: 1.75 }}
        >
          {profile.inVoyage}
        </p>
      </div>
    </section>
  );
}
