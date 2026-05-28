/**
 * / — 랜딩 (Server Component)
 *
 * 로그인 상태와 role에 따라:
 *   - admin → /admin 자동 리다이렉트
 *   - coach → /coach 자동 리다이렉트
 *   - 그 외(미로그인 + 멤버) → 랜딩 화면 표시
 *
 * 랜딩 화면은 3종 사용자(멤버/코치/관리자) 각각의 진입로를 명시한다.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthContext } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const auth = await getAuthContext();
  if (auth?.role === 'admin') redirect('/admin');
  if (auth?.role === 'coach') redirect('/coach');

  const isMember = auth?.role === 'user';

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12 md:py-16">
      {/* 히어로 */}
      <section className="mb-16 w-full max-w-2xl text-center">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sail-orange text-2xl text-white shadow-card">
            ⛵
          </div>
          <span className="text-h3 font-bold text-sail-navy">SAIL</span>
        </div>

        <h1 className="mb-4 text-display font-bold tracking-tight text-sail-gray-900 sm:text-5xl">
          당신은 이 항해에서<br />
          어떤 <span className="text-sail-orange">역할</span>을 하고 있습니까?
        </h1>

        <p className="mx-auto mb-3 max-w-md text-body-lg leading-relaxed text-sail-gray-600">
          Merrill-Reid 이론 기반 30문항 소통 스타일 진단.
          <br />
          7~9분이면 충분합니다.
        </p>
        <p className="mx-auto mb-10 max-w-md text-bodySm text-sail-gray-500">
          주도성(Ask↔Tell) × 감정표현성(Control↔Emote) 두 축으로
          <br />
          자신의 소통 스타일을 확인하세요.
        </p>

        {/* 4유형 미리보기 */}
        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { code: 'S', kr: '선장', combo: 'Tell+Control', emoji: '⚓', bg: 'bg-sail-s' },
            { code: 'A', kr: '모험가', combo: 'Tell+Emote', emoji: '🌅', bg: 'bg-sail-a' },
            { code: 'I', kr: '해석가', combo: 'Ask+Control', emoji: '🔭', bg: 'bg-sail-i' },
            { code: 'L', kr: '수호자', combo: 'Ask+Emote', emoji: '🛟', bg: 'bg-sail-l' },
          ].map((t) => (
            <div
              key={t.code}
              className={`${t.bg} flex flex-col items-center gap-1 rounded-card p-4 text-white shadow-card`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-caption font-medium opacity-80">{t.code}</span>
              <span className="text-bodySm font-semibold">{t.kr}</span>
              <span className="text-tiny font-medium opacity-75">{t.combo}</span>
            </div>
          ))}
        </div>

        {/* 메인 CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/test"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-button bg-sail-orange px-6 text-base font-semibold text-white shadow-card transition-all hover:bg-sail-orange-hover hover:shadow-card-hover active:translate-y-px"
          >
            진단 시작하기
          </Link>
          <Link
            href="/guide"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-button border border-sail-gray-300 bg-white px-6 text-base font-semibold text-sail-navy transition-all hover:border-sail-navy hover:bg-sail-navy-bg"
          >
            유형 가이드 보기
          </Link>
        </div>
      </section>

      {/* 3종 사용자 진입 카드 */}
      <section className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-caption font-semibold uppercase tracking-wider text-sail-orange">
            누구를 위한 도구인가
          </p>
          <h2 className="mt-2 text-h2 font-bold text-sail-gray-900">
            세 가지 역할의 항해
          </h2>
          <p className="mt-2 text-bodySm text-sail-gray-600">
            진단을 받는 사람, 진단을 활용하는 사람, 모두를 돕는 사람
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* 멤버 */}
          <RoleCard
            badge="멤버 · 고객"
            badgeClass="bg-sail-gray-200 text-sail-gray-700"
            title="진단을 받는 사람"
            description="조직 구성원·팀원·교회 봉사자 등 일반 사용자. 자신의 소통 스타일을 진단하고, 다른 사람과 효과적으로 소통하는 방법을 익힙니다."
            steps={[
              '진단 시작 (가입 없이 가능)',
              '코치에게 받은 5자리 코드 입력 (선택)',
              '30문항 응답 → 결과 리포트 확인',
              '소통 가이드·궁합표를 참고해 적용',
            ]}
            ctaLabel={isMember ? '진단하기' : '진단 시작'}
            ctaHref="/test"
          />

          {/* 코치 */}
          <RoleCard
            badge="코치"
            badgeClass="bg-sail-navy text-white"
            title="진단을 활용하는 사람"
            description="진단을 실시하고 해석하는 코치·퍼실리테이터·HR 담당자. 그룹을 만들어 팀원들의 진단 결과를 한눈에 보고, 워크숍·코칭에 활용합니다."
            steps={[
              '가입 후 코치 권한 신청',
              '관리자 승인 → 코치 권한 부여',
              '그룹 생성 → 5자리 코드 발급',
              '멤버에게 코드 공유 → 결과 모니터링',
            ]}
            ctaLabel={auth ? '코치 권한 신청' : '코치로 시작하기'}
            ctaHref={auth ? '/coach/apply' : '/login?redirect=/coach/apply'}
            highlight
          />

          {/* 어드민 */}
          <RoleCard
            badge="관리자"
            badgeClass="bg-sail-orange text-white"
            title="모두를 돕는 사람"
            description="서비스 전반을 관리합니다. 코치 신청 승인, 사용자 역할 관리, 전체 통계 조회 권한이 있습니다."
            steps={[
              '슈퍼어드민 1명 (사전 지정)',
              '코치 신청 검토·승인·거부',
              '사용자 역할 수동 승격 가능',
              '전체 그룹·진단 통계 조회',
            ]}
            ctaLabel={auth ? '관리자 로그인' : '관리자 로그인'}
            ctaHref="/login?redirect=/admin"
          />
        </div>
      </section>

      <p className="mt-16 text-caption text-sail-gray-500">
        Merrill-Reid Social Styles Model 기반 · 무료 진단
      </p>
    </main>
  );
}

function RoleCard({
  badge,
  badgeClass,
  title,
  description,
  steps,
  ctaLabel,
  ctaHref,
  highlight = false,
}: {
  badge: string;
  badgeClass: string;
  title: string;
  description: string;
  steps: string[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-card border bg-white p-card shadow-card transition hover:shadow-card-hover ${
        highlight
          ? 'border-sail-navy ring-1 ring-sail-navy/20'
          : 'border-sail-gray-200'
      }`}
    >
      <span
        className={`mb-3 inline-flex w-fit items-center rounded-pill px-3 py-1 text-tiny font-semibold ${badgeClass}`}
      >
        {badge}
      </span>
      <h3 className="mb-2 text-h4 font-bold text-sail-gray-900">{title}</h3>
      <p className="mb-4 text-bodySm leading-relaxed text-sail-gray-600">
        {description}
      </p>
      <ol className="mb-5 flex-1 space-y-2 text-bodySm text-sail-gray-700">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sail-gray-100 text-tiny font-bold text-sail-gray-600">
              {i + 1}
            </span>
            <span className="leading-snug">{s}</span>
          </li>
        ))}
      </ol>
      <Link
        href={ctaHref}
        className={`inline-flex h-10 items-center justify-center rounded-button px-4 text-bodySm font-semibold transition ${
          highlight
            ? 'bg-sail-navy text-white hover:bg-sail-navy-light'
            : 'border border-sail-gray-300 bg-white text-sail-navy hover:border-sail-navy hover:bg-sail-navy-bg'
        }`}
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}
