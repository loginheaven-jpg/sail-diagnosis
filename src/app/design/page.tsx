import Link from 'next/link';

import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'SAIL 디자인 시스템 v2.0 — 라이브 레퍼런스',
  description: 'Quiet Luxury 토큰의 실 렌더링 검증 페이지',
};

/**
 * /design — SAIL 디자인 시스템 v2.0 라이브 레퍼런스
 *
 * SAIL_DESIGN_SYSTEM.md(v2.0 Quiet Luxury)의 시각적 짝(visual counterpart).
 * 토큰을 변경했을 때 의도한 대로 렌더링되는지 한 화면에서 확인한다.
 *
 * 이전 v1.0 라이트 레퍼런스(420줄)는 archived. 본 페이지는 핵심 토큰만 표시.
 */

const TYPES = [
  { code: 'S', english: 'Skipper', korean: '선장', hex: '#1E3A5F', combo: 'Tell + Control' },
  { code: 'A', english: 'Adventurer', korean: '모험가', hex: '#F28C38', combo: 'Tell + Emote' },
  { code: 'I', english: 'Interpreter', korean: '해석가', hex: '#9B7BC9', combo: 'Ask + Control' },
  { code: 'L', english: 'Lifeguard', korean: '수호자', hex: '#3DB389', combo: 'Ask + Emote' },
] as const;

const PALETTE = [
  { name: 'abyss', hex: '#0A1628', label: '페이지 기본 배경' },
  { name: 'deep', hex: '#0F2438', label: '카드·표면' },
  { name: 'navy', hex: '#1E3A5F', label: 'S형 / 중간 강조' },
  { name: 'slate', hex: '#2A4D6E', label: '보더·구분' },
  { name: 'gold', hex: '#C9A227', label: '주 악센트, CTA' },
  { name: 'gold-soft', hex: '#E0C977', label: '제목 강조, 호버' },
  { name: 'mist', hex: '#A9BBD0', label: '보조 텍스트' },
  { name: 'paper', hex: '#F4EFE6', label: '본문·제목 텍스트' },
  { name: 'foam', hex: '#7FD4D0', label: '나침반 영역 악센트' },
] as const;

const SEMANTIC = [
  { name: 'success', hex: '#4ADE80' },
  { name: 'warning', hex: '#FBBF24' },
  { name: 'danger', hex: '#F87171' },
  { name: 'info', hex: '#38BDF8' },
] as const;

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

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-9 md:py-12">
      {/* 헤더 */}
      <header>
        <p
          className="text-sail-mist/60"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            letterSpacing: '0.18em',
          }}
        >
          <Link href="/" className="hover:text-sail-gold">
            HOME
          </Link>
          <span className="mx-2 opacity-60">/</span>
          <span>DESIGN</span>
        </p>
        <p className="mt-4 text-sail-gold" style={META_LABEL}>
          v2.0 — Quiet Luxury
        </p>
        <h1
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(32px, 4.4vw, 44px)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
          }}
        >
          SAIL Design System
        </h1>
        <p
          className="mt-3 max-w-2xl text-sail-mist"
          style={{ fontSize: 15, lineHeight: 1.75 }}
        >
          이 페이지는 SAIL_DESIGN_SYSTEM.md의 시각적 짝입니다. 토큰을 변경했을 때 의도한 대로 렌더링되는지 한 화면에서 검증합니다.
        </p>
      </header>

      {/* 베이스 팔레트 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          §2.1 Base Palette
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.005em' }}
        >
          베이스 팔레트
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {PALETTE.map((p) => (
            <div
              key={p.name}
              className="rounded-card border"
              style={{
                background: 'rgba(10,22,40,0.45)',
                borderColor: 'rgba(232,237,242,0.08)',
              }}
            >
              <div
                style={{
                  background: p.hex,
                  height: 56,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                }}
              />
              <div className="px-4 py-3">
                <p
                  className="font-serif text-sail-paper"
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.05em' }}
                >
                  --{p.name}
                </p>
                <p
                  className="text-sail-mist"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                  }}
                >
                  {p.hex}
                </p>
                <p
                  className="mt-1 text-sail-mist/70"
                  style={{ fontSize: 12, lineHeight: 1.5 }}
                >
                  {p.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4유형 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          §2.2 SAIL Types
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.005em' }}
        >
          4유형 색상 (다크 배경 최적화)
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((t) => (
            <div
              key={t.code}
              className="relative overflow-hidden rounded-card border p-5"
              style={{
                background: 'rgba(10,22,40,0.5)',
                borderColor: 'rgba(232,237,242,0.08)',
              }}
            >
              <div
                aria-hidden
                className="absolute left-0 top-0 bottom-0"
                style={{
                  width: 2,
                  background: `linear-gradient(180deg, ${t.hex} 0%, transparent 100%)`,
                  opacity: 0.85,
                }}
              />
              <p
                className="font-serif"
                style={{
                  ...META_LABEL,
                  color: t.code === 'S' ? 'var(--color-sail-paper)' : t.hex,
                }}
              >
                {t.combo}
              </p>
              <h3
                className="mt-2 font-serif text-sail-paper"
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                }}
              >
                {t.english}
              </h3>
              <p
                className="mt-1 text-sail-mist"
                style={{ fontSize: 13 }}
              >
                {t.korean} · {t.code}
              </p>
              <p
                className="mt-3 text-sail-mist/70"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                }}
              >
                {t.hex}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 시맨틱 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          §2.3 Semantic
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.005em' }}
        >
          시맨틱 색상 (상태)
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {SEMANTIC.map((s) => (
            <div
              key={s.name}
              className="rounded-card border px-4 py-3"
              style={{
                background: `${s.hex}10`,
                borderColor: `${s.hex}50`,
              }}
            >
              <p
                style={{
                  ...META_LABEL,
                  color: s.hex,
                }}
              >
                {s.name}
              </p>
              <p
                className="mt-1 text-sail-mist"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                }}
              >
                {s.hex}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 타이포그래피 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          §3 Typography
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.005em' }}
        >
          타이포그래피
        </h2>
        <div className="mt-6 space-y-5">
          <Sample label="Hero · Cormorant 500 · 64px">
            <p
              className="font-serif text-sail-paper"
              style={{
                fontSize: 64,
                fontWeight: 500,
                lineHeight: 1.12,
                letterSpacing: '-0.01em',
              }}
            >
              SAIL
            </p>
          </Sample>
          <Sample label="Display · Cormorant 500 · 44px">
            <p
              className="font-serif text-sail-paper"
              style={{
                fontSize: 44,
                fontWeight: 500,
                lineHeight: 1.2,
                letterSpacing: '-0.005em',
              }}
            >
              유형에는 우열이 없다
            </p>
          </Sample>
          <Sample label="H1 · Cormorant 500 · 34px">
            <p
              className="font-serif text-sail-paper"
              style={{
                fontSize: 34,
                fontWeight: 500,
                lineHeight: 1.25,
              }}
            >
              관리자 대시보드
            </p>
          </Sample>
          <Sample label="Body · 고운바탕 400 · 16px">
            <p
              className="text-sail-paper"
              style={{
                fontFamily: 'var(--font-korean)',
                fontSize: 16,
                lineHeight: 1.75,
                fontWeight: 400,
              }}
            >
              본문 텍스트는 16px 고운바탕 400으로 렌더링되며 줄간격 1.75를 유지합니다. 모바일에서도 본문 크기를 줄이지 않습니다.
            </p>
          </Sample>
          <Sample label="Label · Cormorant 600 · 11px · 0.28em letterSpacing">
            <p
              className="text-sail-gold"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
              }}
            >
              Voyage Profile
            </p>
          </Sample>
        </div>
      </section>

      {/* 컴포넌트 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          §7 Components
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.005em' }}
        >
          핵심 컴포넌트
        </h2>

        <div className="mt-6 space-y-6">
          <Sample label="Button — primary / outline / ghost / danger">
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </Sample>

          <Sample label="Card — default surface">
            <div
              className="rounded-card border p-6"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.6) 100%)',
                borderColor: 'rgba(169,187,208,0.12)',
              }}
            >
              <p
                className="text-sail-paper"
                style={{ fontSize: 14, lineHeight: 1.75 }}
              >
                일반 카드는 네이비 그라데이션 위에 미스트 보더로 표시됩니다.
              </p>
            </div>
          </Sample>

          <Sample label="Progress Bar — 3px gold gradient">
            <div
              className="h-[3px] w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(169,187,208,0.12)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: '60%',
                  background:
                    'linear-gradient(90deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
                }}
              />
            </div>
          </Sample>

          <Sample label="Input — 다크 폼 필드">
            <input
              type="text"
              placeholder="입력 예시"
              className="h-12 w-full rounded-input border px-4"
              style={{
                background: 'rgba(10,22,40,0.55)',
                borderColor: 'rgba(232,237,242,0.12)',
                color: 'var(--color-sail-paper)',
                fontFamily: 'var(--font-korean)',
                fontSize: 15,
              }}
            />
          </Sample>
        </div>
      </section>

      <p
        className="text-center text-sail-mist/50"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          letterSpacing: '0.3em',
        }}
      >
        SAIL DESIGN SYSTEM · v2.0
      </p>
    </main>
  );
}

function Sample({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-card border p-5"
      style={{
        background: 'rgba(10,22,40,0.45)',
        borderColor: 'rgba(232,237,242,0.08)',
      }}
    >
      <p
        className="mb-4 text-sail-mist"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 10,
          letterSpacing: '0.22em',
          fontWeight: 500,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
