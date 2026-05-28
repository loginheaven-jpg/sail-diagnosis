/**
 * /guide — 4유형 상세 가이드 (랜딩 페이지 "유형 가이드 보기" 버튼의 목적지)
 *
 * type-profiles.ts 의 콘텐츠를 4유형 카드 그리드 + 펼침 카드로 표시.
 * 진단 전에 사용자가 유형 개요를 살펴볼 수 있도록 함.
 */

import Link from 'next/link';

import { TYPE_PROFILES } from '@/data/type-profiles';
import {
  SAIL_TYPES,
  SAIL_TYPE_LIST,
  type SailType,
} from '@/types/sail';

export const metadata = {
  title: '유형 가이드 · SAIL 소통 스타일 진단',
  description:
    '4가지 소통 스타일(S 선장, A 모험가, I 해석가, L 수호자)의 강점·그림자·소통 팁을 한눈에.',
};

const BG_CLASS: Record<SailType, string> = {
  S: 'bg-sail-s',
  A: 'bg-sail-a',
  I: 'bg-sail-i',
  L: 'bg-sail-l',
};

const TINT_CLASS: Record<SailType, string> = {
  S: 'bg-[color:var(--color-sail-s-tint)]',
  A: 'bg-[color:var(--color-sail-a-tint)]',
  I: 'bg-[color:var(--color-sail-i-tint)]',
  L: 'bg-[color:var(--color-sail-l-tint)]',
};

const TEXT_CLASS: Record<SailType, string> = {
  S: 'text-sail-s',
  A: 'text-sail-a',
  I: 'text-sail-i',
  L: 'text-sail-l',
};

export default function GuidePage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8 md:py-12">
      {/* 헤더 */}
      <header className="text-center">
        <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-sail-orange">
          유형 가이드
        </p>
        <h1 className="text-h1 font-bold text-sail-gray-900">
          4가지 소통 스타일
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-body text-sail-gray-600">
          Merrill-Reid Social Styles Model 기반. 주도성(Ask↔Tell)과
          감정표현성(Control↔Emote) 두 축이 만드는 네 유형입니다.
        </p>
        <Link
          href="/test"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-button bg-sail-orange px-6 text-body font-semibold text-white shadow-card transition hover:bg-sail-orange-hover"
        >
          내 유형 진단하기 →
        </Link>
      </header>

      {/* 두 축 안내 */}
      <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
        <h2 className="mb-3 text-h3 font-bold text-sail-navy">두 축</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card bg-sail-gray-50 p-5">
            <p className="text-bodySm font-semibold text-sail-gray-700">주도성</p>
            <p className="text-h4 font-bold text-sail-navy">Ask ↔ Tell</p>
            <p className="mt-2 text-bodySm text-sail-gray-700">
              타인에게 자신의 관점을 관철하려는 정도. 묻는가(Ask), 말하는가(Tell)?
            </p>
          </div>
          <div className="rounded-card bg-sail-gray-50 p-5">
            <p className="text-bodySm font-semibold text-sail-gray-700">감정표현성</p>
            <p className="text-h4 font-bold text-sail-navy">Control ↔ Emote</p>
            <p className="mt-2 text-bodySm text-sail-gray-700">
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
          return (
            <article
              key={t}
              className="rounded-question border border-sail-gray-200 bg-white shadow-card md:flex md:overflow-hidden"
            >
              {/* 좌측 — 유형 헤더 */}
              <div
                className={`${BG_CLASS[t]} flex flex-row items-center gap-4 p-6 text-white md:w-72 md:flex-col md:items-start md:gap-3`}
              >
                <div
                  aria-hidden
                  className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-3xl backdrop-blur-sm md:h-16 md:w-16 md:text-4xl"
                >
                  {info.emoji}
                </div>
                <div>
                  <p className="text-caption font-semibold uppercase opacity-85">
                    {info.englishName} · {info.axisCombo}
                  </p>
                  <h3 className="text-h2 font-bold leading-tight">
                    {info.koreanName}
                    <span className="ml-2 text-h4 opacity-80">({t}형)</span>
                  </h3>
                  <p className="mt-2 text-bodySm leading-relaxed opacity-95">
                    {info.tagline}
                  </p>
                </div>
              </div>

              {/* 우측 — 강점·그림자·대표 문장 */}
              <div className="flex-1 p-6 md:p-7">
                <p
                  className={`mb-3 inline-block rounded-md px-3 py-1 text-bodySm font-medium italic ${TINT_CLASS[t]} ${TEXT_CLASS[t]}`}
                >
                  {profile.signaturePhrase}
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-1.5 text-bodySm font-semibold text-sail-gray-800">
                      💪 강점
                    </h4>
                    <ul className="space-y-1 text-bodySm text-sail-gray-700">
                      {profile.strengths.map((s) => (
                        <li key={s} className="flex gap-1.5">
                          <span className="text-sail-success">●</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-1.5 text-bodySm font-semibold text-sail-gray-800">
                      🌑 그림자
                    </h4>
                    <ul className="space-y-1 text-bodySm text-sail-gray-700">
                      {profile.shadows.map((s) => (
                        <li key={s} className="flex gap-1.5">
                          <span className="text-sail-warning">●</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="mt-4 border-t border-sail-gray-100 pt-3 text-bodySm leading-relaxed text-sail-gray-600">
                  <span className="font-semibold text-sail-gray-800">항해 속 모습 ·</span>{' '}
                  {info.metaphor}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* 유연성 */}
      <section className="rounded-question bg-sail-navy p-card text-center text-white shadow-card-hover">
        <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-sail-orange">
          🧭 스타일 유연성 (Versatility)
        </p>
        <h2 className="text-h2 font-bold">
          유형에는 우열이 없지만,
          <br />
          유연성에는 우열이 있다.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body opacity-85">
          자기 유형을 알되, 상대의 유형에 맞춰 소통 방식을 조절할 수 있는 사람이 가장 효과적입니다.
        </p>
        <Link
          href="/test"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-button bg-sail-orange px-6 text-body-lg font-semibold text-white shadow-card transition hover:bg-sail-orange-hover"
        >
          내 유형부터 알아보기 →
        </Link>
      </section>
    </main>
  );
}
