/**
 * /guide — 4유형 상세 가이드 (Quiet Luxury v2.0)
 */

import Link from 'next/link';

import { TYPE_PROFILES } from '@/data/type-profiles';
import { SAIL_TYPES, SAIL_TYPE_LIST, type SailType } from '@/types/sail';

export const metadata = {
  title: '유형 가이드 · SAIL 소통 스타일 진단',
  description:
    '4가지 소통 스타일(S 선장, A 모험가, I 해석가, L 수호자)의 강점·그림자·소통 팁을 한눈에.',
};

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#9B7BC9',
  L: '#3DB389',
};

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

const SECTION_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
  borderColor: 'rgba(169,187,208,0.12)',
};

const INNER_BOX: React.CSSProperties = {
  background: 'rgba(10,22,40,0.45)',
  borderColor: 'rgba(232,237,242,0.08)',
};

export default function GuidePage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-9 px-4 py-9 md:py-14">
      {/* 헤더 */}
      <header className="text-center">
        <p className="text-sail-gold" style={META_LABEL}>
          ✦ Type Guide
        </p>
        <h1
          className="mt-3 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(34px, 5vw, 48px)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
          }}
        >
          Four Communication Styles
        </h1>
        <p
          className="mt-3 text-sail-mist"
          style={{ fontSize: 'clamp(16px, 2vw, 18px)', fontWeight: 400 }}
        >
          4가지 소통 스타일
        </p>
        <p
          className="mx-auto mt-5 max-w-xl text-sail-mist"
          style={{ fontSize: 15, lineHeight: 1.8 }}
        >
          Merrill-Reid Social Styles Model 기반. 주도성(Ask↔Tell)과 감정표현성(Control↔Emote) 두 축이 만드는 네 유형입니다.
        </p>
        <Link
          href="/test"
          className="mt-8 inline-flex items-center rounded-btn transition-all duration-300 hover:-translate-y-[2px]"
          style={{
            background:
              'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
            color: '#0A1628',
            fontWeight: 700,
            padding: '14px 30px',
            fontSize: 15,
            letterSpacing: '0.04em',
            boxShadow: 'var(--shadow-gold)',
            fontFamily: 'var(--font-korean)',
          }}
        >
          내 유형 진단하기 →
        </Link>
      </header>

      {/* 두 축 안내 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          Two Axes
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(22px, 2.6vw, 26px)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          두 축
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div
            className="rounded-card border px-6 py-5"
            style={INNER_BOX}
          >
            <p className="text-sail-mist" style={{ ...META_LABEL, fontSize: 10 }}>
              Assertiveness
            </p>
            <p
              className="mt-1 font-serif text-sail-paper"
              style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.005em' }}
            >
              주도성 · Ask ↔ Tell
            </p>
            <p
              className="mt-3 text-sail-mist"
              style={{ fontSize: 14, lineHeight: 1.75 }}
            >
              타인에게 자신의 관점을 관철하려는 정도. 묻는가(Ask), 말하는가(Tell)?
            </p>
          </div>
          <div
            className="rounded-card border px-6 py-5"
            style={INNER_BOX}
          >
            <p className="text-sail-mist" style={{ ...META_LABEL, fontSize: 10 }}>
              Responsiveness
            </p>
            <p
              className="mt-1 font-serif text-sail-paper"
              style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.005em' }}
            >
              감정표현성 · Control ↔ Emote
            </p>
            <p
              className="mt-3 text-sail-mist"
              style={{ fontSize: 14, lineHeight: 1.75 }}
            >
              자기 감정을 외부로 드러내는 정도. 통제하는가(Control), 표출하는가(Emote)?
            </p>
          </div>
        </div>
      </section>

      {/* 4유형 카드 */}
      <section className="space-y-5">
        {SAIL_TYPE_LIST.map((t) => {
          const info = SAIL_TYPES[t];
          const profile = TYPE_PROFILES[t];
          const accent = TYPE_HEX[t];

          return (
            <article
              key={t}
              className="relative overflow-hidden rounded-modal border md:flex"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15,36,56,0.7) 0%, rgba(10,22,40,0.8) 100%)',
                borderColor: 'rgba(169,187,208,0.12)',
              }}
            >
              {/* 좌측 강조 라인 */}
              <div
                aria-hidden
                className="absolute left-0 top-0 bottom-0"
                style={{
                  width: 3,
                  background: `linear-gradient(180deg, ${accent} 0%, transparent 100%)`,
                  opacity: 0.8,
                }}
              />

              {/* 좌측 — 유형 헤더 */}
              <div
                className="flex flex-row items-center gap-5 p-7 md:w-80 md:flex-col md:items-start md:gap-4"
              >
                <div
                  aria-hidden
                  className="flex h-16 w-16 items-center justify-center rounded-xl text-3xl md:h-20 md:w-20 md:text-4xl"
                  style={{
                    background: `${accent}1F`,
                    border: `1px solid ${accent}40`,
                    boxShadow: `0 0 24px ${accent}33`,
                  }}
                >
                  {info.emoji}
                </div>
                <div>
                  <p
                    style={{
                      ...META_LABEL,
                      color: accent,
                      fontSize: 11,
                    }}
                  >
                    {info.axisCombo}
                  </p>
                  <h3
                    className="mt-2 font-serif text-sail-paper"
                    style={{
                      fontSize: 'clamp(26px, 3.4vw, 32px)',
                      fontWeight: 500,
                      letterSpacing: '-0.015em',
                      lineHeight: 1.1,
                    }}
                  >
                    {info.englishName}
                  </h3>
                  <p
                    className="mt-1 text-sail-mist"
                    style={{ fontSize: 14, letterSpacing: '0.03em' }}
                  >
                    {info.koreanName} · {t}
                  </p>
                  <p
                    className="mt-4 text-sail-paper/90"
                    style={{ fontSize: 14, lineHeight: 1.7 }}
                  >
                    {info.tagline}
                  </p>
                </div>
              </div>

              {/* 우측 — 강점·그림자·대표 문장 */}
              <div className="flex-1 p-7">
                <p
                  className="mb-5 inline-block rounded-md italic"
                  style={{
                    background: `${accent}14`,
                    border: `1px solid ${accent}33`,
                    color: 'var(--color-sail-paper)',
                    padding: '6px 14px',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 14,
                  }}
                >
                  &ldquo;{profile.signaturePhrase}&rdquo;
                </p>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sail-gold" style={META_LABEL}>
                      Strengths
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {profile.strengths.map((s) => (
                        <li
                          key={s}
                          className="flex gap-2 text-sail-mist"
                          style={{ fontSize: 13, lineHeight: 1.65 }}
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
                  <div>
                    <p className="text-sail-mist/70" style={META_LABEL}>
                      Shadows
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {profile.shadows.map((s) => (
                        <li
                          key={s}
                          className="flex gap-2 text-sail-mist"
                          style={{ fontSize: 13, lineHeight: 1.65 }}
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

                <p
                  className="mt-5 pt-4 text-sail-mist"
                  style={{
                    borderTop: '1px solid rgba(232,237,242,0.06)',
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  <span className="text-sail-gold" style={{ fontWeight: 600 }}>
                    In voyage:
                  </span>{' '}
                  {info.metaphor}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* 유연성 */}
      <section
        className="relative overflow-hidden rounded-modal border p-9 text-center md:p-12"
        style={{
          background:
            'linear-gradient(160deg, rgba(15,36,56,0.85) 0%, rgba(10,22,40,0.95) 100%)',
          borderColor: 'rgba(201,162,39,0.28)',
          boxShadow:
            '0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div
          aria-hidden
          className="absolute -left-24 -top-24 h-72 w-72 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(201,162,39,0.18) 0%, transparent 70%)',
            filter: 'blur(32px)',
          }}
        />

        <div className="relative">
          <p
            className="text-sail-gold"
            style={{ ...META_LABEL, letterSpacing: '0.4em' }}
          >
            ✦ Versatility
          </p>
          <h2
            className="mt-4 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(26px, 4vw, 36px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
              lineHeight: 1.25,
            }}
          >
            유형에는 우열이 없지만,
            <br />
            유연성에는 우열이 있다
          </h2>
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
            className="mx-auto mt-5 max-w-md text-sail-mist"
            style={{
              fontSize: 'clamp(14px, 1.6vw, 16px)',
              lineHeight: 1.8,
            }}
          >
            자기 유형을 알되, 상대의 유형에 맞춰 소통 방식을 조절할 수 있는 사람이 가장 효과적입니다.
          </p>
          <Link
            href="/test"
            className="mt-8 inline-flex items-center rounded-btn transition-all duration-300 hover:-translate-y-[2px]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
              color: '#0A1628',
              fontWeight: 700,
              padding: '15px 32px',
              fontSize: 16,
              letterSpacing: '0.04em',
              boxShadow: 'var(--shadow-gold)',
              fontFamily: 'var(--font-korean)',
            }}
          >
            내 유형부터 알아보기 →
          </Link>
        </div>
      </section>
    </main>
  );
}
