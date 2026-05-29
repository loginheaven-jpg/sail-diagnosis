/**
 * / — 랜딩 (Server Component) v2.0 Quiet Luxury
 *
 * 구조 (확정 시안 sail_landing_final.html 기반):
 *   1. 히어로: eyebrow + h1(Cormorant, "어떤 역할"은 골드 이탤릭) + lead + axis-note + CTA
 *   2. 컴퍼스 (시그니처)
 *   3. 4유형 카드 띠
 *   4. 3종 역할 진입 카드 (멤버 / 코치 / 어드민)
 *   5. 푸터
 *
 * 로그인 사용자 라우팅:
 *   admin → /admin, coach → /coach, user/anonymous → 이 페이지
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Compass } from '@/components/brand/Compass';
import { getAuthContext } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

const TYPES = [
  {
    code: 'S',
    en: 'Skipper',
    kr: '선장',
    emoji: '⚓',
    combo: 'Tell + Control',
    desc: '방향을 정하고 흔들림 없이 이끈다.',
    color: 'var(--color-sail-paper)',
  },
  {
    code: 'A',
    en: 'Adventurer',
    kr: '모험가',
    emoji: '🌅',
    combo: 'Tell + Emote',
    desc: '새 방향을 제시하고 열정으로 움직인다.',
    color: 'var(--color-sail-a)',
  },
  {
    code: 'I',
    en: 'Interpreter',
    kr: '해석가',
    emoji: '🔭',
    combo: 'Ask + Control',
    desc: '묻고 모아 냉정하게 최적해를 찾는다.',
    color: 'var(--color-sail-i)',
  },
  {
    code: 'L',
    en: 'Lifeguard',
    kr: '수호자',
    emoji: '🛟',
    combo: 'Ask + Emote',
    desc: '먼저 듣고 모두의 안녕을 지킨다.',
    color: 'var(--color-sail-l)',
  },
];

export default async function Home() {
  const auth = await getAuthContext();
  if (auth?.role === 'admin') redirect('/admin');
  if (auth?.role === 'coach') redirect('/coach');

  return (
    <main className="relative mx-auto w-full max-w-[1180px] px-[clamp(22px,4vw,32px)]">
      {/* ============ Hero ============ */}
      <section className="grid items-center gap-12 py-16 md:grid-cols-[1.15fr_0.85fr] md:gap-[60px] md:py-20 lg:py-[110px]">
        <div className="order-2 md:order-1">
          <div
            className="rise-1 font-serif italic text-sail-gold"
            style={{ fontSize: 19, letterSpacing: '0.08em', marginBottom: 28 }}
          >
            Merrill–Reid Social Styles
          </div>

          <h1
            className="rise-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(38px, 7vw, 64px)',
              fontWeight: 500,
              lineHeight: 1.12,
              letterSpacing: '-0.01em',
              marginBottom: 30,
            }}
          >
            당신은 이 항해에서
            <br />
            <span className="italic text-sail-gold-soft">어떤 역할</span>을<br />
            하고 있습니까?
          </h1>

          <p
            className="rise-3 text-sail-mist"
            style={{ fontSize: 17, maxWidth: 440, marginBottom: 18 }}
          >
            30개의 질문으로 당신의 소통 스타일을 읽습니다. 7~9분이면 충분합니다.
          </p>

          <p
            className="rise-4"
            style={{
              fontSize: 14.5,
              color: 'rgba(169,187,208,.78)',
              maxWidth: 430,
              paddingLeft: 16,
              borderLeft: '1px solid rgba(201,162,39,.35)',
              marginBottom: 44,
              lineHeight: 1.75,
            }}
          >
            주도성(Ask ↔ Tell)과 감정표현성(Control ↔ Emote),<br />
            두 개의 축이 만드는 네 개의 항해 스타일.
          </p>

          <div className="rise-5 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/test"
              className="inline-flex items-center justify-center rounded-btn transition-all duration-300"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
                color: '#0A1628',
                fontWeight: 700,
                padding: '16px 34px',
                fontSize: 15,
                letterSpacing: '0.04em',
                boxShadow: 'var(--shadow-gold)',
                fontFamily: 'var(--font-korean)',
              }}
            >
              진단 시작하기
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center justify-center rounded-btn border border-sail-mist/30 text-sail-paper transition-all duration-300 hover:border-sail-gold-soft hover:text-sail-gold-soft"
              style={{
                padding: '16px 34px',
                fontSize: 15,
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-korean)',
              }}
            >
              유형 가이드 보기
            </Link>
          </div>
        </div>

        {/* 나침반 — 모바일에서는 위로 */}
        <div className="fade-in order-1 flex items-center justify-center md:order-2">
          <Compass size={290} className="md:!w-[370px] md:!h-[370px]" />
        </div>
      </section>

      {/* ============ 4유형 카드 띠 ============ */}
      <section className="mb-[60px] md:mb-[100px]">
        <div
          className="grid overflow-hidden rounded-card border border-sail-mist/12 sm:grid-cols-2 lg:grid-cols-4"
          style={{
            gap: '1px',
            background: 'rgba(169,187,208,.12)',
          }}
        >
          {TYPES.map((t) => (
            <div
              key={t.code}
              className="relative overflow-hidden transition-all duration-[400ms] group"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15,36,56,.6), rgba(10,22,40,.6))',
                padding: '34px 26px',
              }}
            >
              {/* 상단 강조 라인 (hover scaleX) */}
              <span
                aria-hidden
                className="absolute left-0 top-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ background: t.color }}
              />
              <span className="mb-3.5 block text-3xl">{t.emoji}</span>
              <span
                className="font-serif font-semibold"
                style={{
                  fontSize: 13,
                  letterSpacing: '0.3em',
                  color: t.color,
                }}
              >
                {t.code}
              </span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  className="font-serif text-sail-paper"
                  style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.005em' }}
                >
                  {t.en}
                </span>
                <span
                  className="text-sail-mist/70"
                  style={{ fontSize: 14, fontWeight: 400 }}
                >
                  {t.kr}
                </span>
              </div>
              <div
                className="mt-0.5 text-sail-mist/80"
                style={{ fontSize: 12, letterSpacing: '0.08em' }}
              >
                {t.combo}
              </div>
              <div
                className="mt-3.5 text-sail-mist/85"
                style={{ fontSize: 13.5, lineHeight: 1.65 }}
              >
                {t.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ How it works ============ */}
      <section className="pb-[60px] md:pb-[90px]">
        <div className="mb-14 text-center">
          <div
            className="font-serif italic text-sail-gold"
            style={{ fontSize: 17, letterSpacing: '0.1em' }}
          >
            How it works
          </div>
          <h2
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            세 번의 항해, 하나의 나침반
          </h2>
          <p
            className="mt-4 text-sail-mist/85"
            style={{ fontSize: 15 }}
          >
            상황 판단 · 가치 선택 · 성향 스펙트럼 — 30문항이 당신의 좌표를 그립니다.
          </p>
        </div>
      </section>

      {/* ============ 2종 역할 진입 (관리자는 1명 — 메뉴 노출 안 함) ============ */}
      <section className="pb-[60px] md:pb-[100px]">
        <div className="mb-12 text-center">
          <div
            className="font-serif italic text-sail-gold"
            style={{ fontSize: 17, letterSpacing: '0.1em' }}
          >
            누구를 위한 도구인가
          </div>
          <h2
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            두 가지 항해의 역할
          </h2>
          <p className="mt-4 text-sail-mist/85" style={{ fontSize: 15 }}>
            진단을 받는 사람과, 진단을 활용해 함께 항해하는 사람
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RoleCard
            badge="멤버 · 고객"
            title="진단을 받는 사람"
            description="조직 구성원·팀원·교회 봉사자. 자신의 소통 스타일을 진단하고 효과적인 소통법을 익힙니다."
            steps={[
              '진단 시작 (가입 없이 가능)',
              '코치에게 받은 5자리 코드 입력 (선택)',
              '30문항 응답 → 결과 리포트',
              '소통 가이드·궁합표 참고',
            ]}
            ctaLabel={auth?.role === 'user' ? '진단하기' : '진단 시작'}
            ctaHref="/test"
          />
          <RoleCard
            badge="코치"
            title="진단을 활용하는 사람"
            description="진단을 실시하는 코치·퍼실리테이터·HR. 그룹의 결과를 한눈에 보고 워크숍·코칭에 활용합니다."
            steps={[
              '가입 후 코치 권한 신청',
              '관리자 승인 → 코치 권한 부여',
              '그룹 생성 → 5자리 코드 발급',
              '멤버에게 코드 공유 → 결과 모니터링',
            ]}
            ctaLabel={auth ? '코치 권한 신청' : '코치로 시작'}
            ctaHref={auth ? '/coach/apply' : '/login?redirect=/coach/apply'}
            highlight
          />
        </div>
      </section>

      <footer
        className="border-t border-sail-mist/10 py-10 text-center text-sail-mist/70"
        style={{ fontSize: 13, letterSpacing: '0.04em' }}
      >
        Merrill–Reid Social Styles Model 기반 · SAIL 소통 스타일 진단
      </footer>
    </main>
  );
}

function RoleCard({
  badge,
  title,
  description,
  steps,
  ctaLabel,
  ctaHref,
  highlight = false,
}: {
  badge: string;
  title: string;
  description: string;
  steps: string[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-card border transition duration-[400ms] ${
        highlight
          ? 'border-sail-gold/30 hover:border-sail-gold/50'
          : 'border-sail-mist/12 hover:border-sail-mist/25'
      }`}
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,.6), rgba(10,22,40,.6))',
        padding: '34px 26px',
      }}
    >
      <span
        className={`mb-3 inline-block w-fit rounded-pill px-3 py-1 font-serif font-semibold ${
          highlight
            ? 'bg-sail-gold text-sail-abyss'
            : 'border border-sail-mist/30 text-sail-mist'
        }`}
        style={{ fontSize: 11, letterSpacing: '0.22em' }}
      >
        {badge.toUpperCase()}
      </span>
      <h3
        className="font-serif text-sail-paper"
        style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}
      >
        {title}
      </h3>
      <p
        className="mb-5 mt-2 text-sail-mist"
        style={{ fontSize: 14.5, lineHeight: 1.7 }}
      >
        {description}
      </p>
      <ol
        className="mb-6 flex-1 space-y-2 text-sail-paper/85"
        style={{ fontSize: 14, lineHeight: 1.65 }}
      >
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-pill border border-sail-gold/40 text-sail-gold-soft"
              style={{ fontSize: 10, fontFamily: 'var(--font-serif)', fontWeight: 600 }}
            >
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <Link
        href={ctaHref}
        className={`inline-flex items-center justify-center rounded-btn px-5 py-3 transition ${
          highlight
            ? 'hover:translate-y-[-2px]'
            : 'border border-sail-mist/30 text-sail-paper font-bold hover:border-sail-gold-soft hover:text-sail-gold-soft'
        }`}
        style={
          highlight
            ? {
                background:
                  'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
                color: '#0A1628',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.04em',
                boxShadow: 'var(--shadow-gold)',
                fontFamily: 'var(--font-korean)',
              }
            : { fontSize: 14, letterSpacing: '0.04em', fontFamily: 'var(--font-korean)' }
        }
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}
