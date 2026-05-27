import Link from 'next/link';

export const metadata = {
  title: 'SAIL 디자인 시스템 비주얼 레퍼런스',
  description: 'SAIL Design System v1.0 — 색상·타이포·컴포넌트 비주얼 레퍼런스',
};

/**
 * /design — SAIL 디자인 시스템 비주얼 레퍼런스 페이지
 *
 * 이 페이지는 SAIL_DESIGN_SYSTEM.md의 시각적 짝(visual counterpart)이다.
 * 디자인 토큰이 실제로 렌더링되는 모습을 한 화면에서 확인할 수 있다.
 *
 * 토큰을 변경했을 때 의도한 대로 반영되었는지 검증하는 데 사용한다.
 */
export default function DesignSystemPage() {
  return (
    <div className="min-h-screen">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-sail-navy px-6 text-white shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sail-orange text-sm font-bold">
            ⛵
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-bodySm font-bold">SAIL</span>
            <span className="text-tiny opacity-70">디자인 시스템 v1.0</span>
          </div>
        </div>
        <nav className="hidden gap-1 text-bodySm font-medium md:flex">
          <a href="#colors" className="px-4 py-1.5 transition hover:bg-white/10">색상</a>
          <a href="#typography" className="px-4 py-1.5 transition hover:bg-white/10">타이포</a>
          <a href="#buttons" className="px-4 py-1.5 transition hover:bg-white/10">버튼</a>
          <a href="#forms" className="px-4 py-1.5 transition hover:bg-white/10">폼</a>
          <a href="#components" className="px-4 py-1.5 transition hover:bg-white/10">컴포넌트</a>
        </nav>
        <Link href="/" className="text-bodySm text-white/80 hover:text-white">
          ← 홈
        </Link>
      </header>

      {/* ============ PAGE TITLE ============ */}
      <div className="border-b border-sail-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="mb-2 text-caption text-sail-gray-500">
            <Link href="/" className="hover:text-sail-navy">홈</Link>
            <span> &gt; </span>
            <span className="font-medium text-sail-gray-700">디자인 시스템 비주얼 레퍼런스</span>
          </p>
          <h1 className="text-h1 font-bold text-sail-gray-900">SAIL 디자인 시스템 v1.0</h1>
          <p className="mt-2 text-body-lg text-sail-gray-600">
            KCA 통합 디자인 가이드를 베이스로 SAIL 4유형 색상·항해 메타포·모션 정책을 더한 시스템.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        {/* ============ 1. COLORS ============ */}
        <Section id="colors" title="1. 색상 시스템" desc="SAIL 4유형 컬러 + Primary Navy + Accent Orange + Neutral + Semantic">
          <Sub>1.1 SAIL 4유형 색상 (도메인 핵심)</Sub>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Swatch name="Skipper (선장)" hex="#1E3A5F" bgClass="bg-sail-s" emoji="⚓" />
            <Swatch name="Adventurer (모험가)" hex="#F28C38" bgClass="bg-sail-a" emoji="🌅" />
            <Swatch name="Interpreter (해석가)" hex="#6B3FA0" bgClass="bg-sail-i" emoji="🔭" />
            <Swatch name="Lifeguard (수호자)" hex="#2E9E6B" bgClass="bg-sail-l" emoji="🛟" />
          </div>

          <Sub>1.2 Primary / Accent (시스템 컬러)</Sub>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Swatch name="Primary Navy" hex="#1E3A5F" bgClass="bg-sail-navy" />
            <Swatch name="Navy Light" hex="#2D4F7B" bgClass="bg-sail-navy-light" />
            <Swatch name="Accent Orange" hex="#F28C38" bgClass="bg-sail-orange" />
            <Swatch name="Orange Hover" hex="#DC7A2A" bgClass="bg-sail-orange-hover" />
          </div>

          <Sub>1.3 Neutral (Slate scale)</Sub>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
            <Swatch name="Gray 50" hex="#F8FAFC" bgClass="bg-sail-gray-50" textDark />
            <Swatch name="Gray 100" hex="#F1F5F9" bgClass="bg-sail-gray-100" textDark />
            <Swatch name="Gray 200" hex="#E2E8F0" bgClass="bg-sail-gray-200" textDark />
            <Swatch name="Gray 300" hex="#CBD5E1" bgClass="bg-sail-gray-300" textDark />
            <Swatch name="Gray 400" hex="#94A3B8" bgClass="bg-sail-gray-400" />
            <Swatch name="Gray 500" hex="#64748B" bgClass="bg-sail-gray-500" />
            <Swatch name="Gray 600" hex="#475569" bgClass="bg-sail-gray-600" />
            <Swatch name="Gray 700" hex="#334155" bgClass="bg-sail-gray-700" />
            <Swatch name="Gray 800" hex="#1E293B" bgClass="bg-sail-gray-800" />
            <Swatch name="Gray 900" hex="#0F172A" bgClass="bg-sail-gray-900" />
          </div>

          <Sub>1.4 Semantic (상태 색상)</Sub>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Swatch name="Success" hex="#16A34A" bgClass="bg-sail-success" />
            <Swatch name="Warning" hex="#F59E0B" bgClass="bg-sail-warning" />
            <Swatch name="Danger" hex="#DC2626" bgClass="bg-sail-danger" />
            <Swatch name="Info" hex="#0EA5E9" bgClass="bg-sail-info" />
          </div>
        </Section>

        {/* ============ 2. TYPOGRAPHY ============ */}
        <Section id="typography" title="2. 타이포그래피" desc="Pretendard Variable. 본문 15px (KCA 가이드와 동일).">
          <div className="space-y-4 divide-y divide-sail-gray-100">
            <TypeRow label="DISPLAY 32px" className="text-display font-bold text-sail-gray-900">
              당신은 어떤 항해 스타일의 코치입니까?
            </TypeRow>
            <TypeRow label="H1 28px" className="text-h1 font-bold text-sail-gray-900">
              명확한 S형 (Skipper)
            </TypeRow>
            <TypeRow label="H2 24px" className="text-h2 font-bold text-sail-gray-900">
              나의 코칭 항해 가이드
            </TypeRow>
            <TypeRow label="H3 20px" className="text-h3 font-bold text-sail-navy">
              강점과 그림자
            </TypeRow>
            <TypeRow label="H4 18px" className="text-h4 font-semibold text-sail-gray-800">
              피코치 유형별 세션 전략
            </TypeRow>
            <TypeRow label="BODY LG 16px" className="text-body-lg text-sail-gray-700">
              새로운 피코치와의 첫 오리엔테이션 세션이다. 피코치는 다소 긴장한 듯 보인다.
            </TypeRow>
            <TypeRow label="BODY 15px ★기본" className="text-body text-sail-gray-700">
              SAIL은 코치와 피코치가 함께 떠나는 항해의 메타포에서 출발한 행동 스타일 진단이다.
            </TypeRow>
            <TypeRow label="BODY SM 14px" className="text-bodySm text-sail-gray-600">
              보조 텍스트. 카드 하단 설명, 폼 필드 도움말에 사용한다.
            </TypeRow>
            <TypeRow label="CAPTION 13px" className="text-caption text-sail-gray-500">
              12 / 30 · 약 4분 남음
            </TypeRow>
            <TypeRow label="TINY 12px" className="text-tiny text-sail-gray-500">
              © 2026 SAIL. Merrill-Reid Social Styles Model 기반.
            </TypeRow>
          </div>
        </Section>

        {/* ============ 3. BUTTONS ============ */}
        <Section id="buttons" title="3. 버튼" desc="한 화면에 Primary 버튼은 1개. CTA는 오렌지, 보조는 네이비.">
          <Sub>3.1 종류</Sub>
          <div className="flex flex-wrap items-center gap-3">
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-sail-orange px-5 text-body font-semibold text-white shadow-card transition-all hover:bg-sail-orange-hover hover:shadow-card-hover active:translate-y-px">
              Primary (CTA)
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-sail-navy px-5 text-body font-semibold text-white transition-all hover:bg-sail-navy-light">
              Secondary
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-button border border-sail-navy bg-transparent px-5 text-body font-semibold text-sail-navy transition-all hover:bg-sail-navy-bg">
              Outline
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-transparent px-5 text-body font-semibold text-sail-gray-700 transition-all hover:bg-sail-gray-100">
              Ghost
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-sail-danger px-5 text-body font-semibold text-white transition-all hover:opacity-90">
              Danger
            </button>
          </div>

          <Sub>3.2 크기</Sub>
          <div className="flex flex-wrap items-center gap-3">
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-button bg-sail-orange px-6 text-body-lg font-semibold text-white shadow-card hover:bg-sail-orange-hover">
              Large 48px
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-sail-orange px-5 text-body font-semibold text-white shadow-card hover:bg-sail-orange-hover">
              Medium 40px ★
            </button>
            <button className="inline-flex h-8 items-center justify-center gap-2 rounded-button bg-sail-orange px-4 text-bodySm font-medium text-white hover:bg-sail-orange-hover">
              Small 32px
            </button>
          </div>
        </Section>

        {/* ============ 4. FORMS ============ */}
        <Section id="forms" title="4. 폼 요소" desc="인풋 44px (KCA 40px보다 살짝 큼, 터치 친화).">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
                닉네임 <span className="text-sail-danger">*</span>
              </label>
              <input
                type="text"
                placeholder="홍길동"
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body text-sail-gray-900 placeholder:text-sail-gray-400 focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
              <p className="mt-1 text-caption text-sail-gray-500">결과 공유 시 표시되는 이름</p>
            </div>

            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
                세미나 코드 (선택)
              </label>
              <input
                type="text"
                placeholder="SAIL-260528"
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body text-sail-gray-900 placeholder:text-sail-gray-400 focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
                오류 상태
              </label>
              <input
                type="text"
                defaultValue="잘못된 입력"
                className="h-11 w-full rounded-input border border-sail-danger px-3.5 text-body text-sail-gray-900 focus:shadow-focus-danger focus:outline-none"
              />
              <p className="mt-1 text-caption text-sail-danger">필수 입력 항목입니다.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
                선택
              </label>
              <select className="h-11 w-full rounded-input border border-sail-gray-300 bg-white px-3.5 text-body text-sail-gray-900 focus:border-sail-navy focus:shadow-focus focus:outline-none">
                <option>전체</option>
                <option>코치</option>
                <option>팀 리더</option>
                <option>HR 담당자</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ============ 5. COMPONENTS ============ */}
        <Section id="components" title="5. 컴포넌트" desc="카드 · 배지 · 알림 · Progress · 결과 미리보기">
          <Sub>5.1 카드 (rounded-card 16px)</Sub>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="진단 결과 저장됨" stat="1,248" label="누적 진단 수" />
            <Card title="이번 주" stat="83" label="신규 응답" />
            <Card title="평균 일관성" stat="94%" label="응답 신뢰도" />
          </div>

          <Sub>5.2 배지</Sub>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-sail-s">S형</Badge>
            <Badge className="bg-sail-a">A형</Badge>
            <Badge className="bg-sail-i">I형</Badge>
            <Badge className="bg-sail-l">L형</Badge>
            <Badge className="bg-emerald-100 text-emerald-800">완료</Badge>
            <Badge className="bg-amber-100 text-amber-800">진행 중</Badge>
            <Badge className="bg-red-100 text-red-800">실패</Badge>
          </div>

          <Sub>5.3 알림</Sub>
          <div className="space-y-3">
            <Alert tone="info" title="진단 안내">
              총 30문항이며 7~9분 정도 소요됩니다. 직관적으로 답변해주세요.
            </Alert>
            <Alert tone="success" title="저장 완료">
              결과가 성공적으로 저장되었습니다. URL로 공유할 수 있습니다.
            </Alert>
            <Alert tone="warning" title="일관성 경고">
              응답에 약간의 모순이 있습니다. 결과 해석 시 참고하세요.
            </Alert>
            <Alert tone="danger" title="저장 실패">
              일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </Alert>
          </div>

          <Sub>5.4 Progress Bar (30문항 진행)</Sub>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-caption font-medium text-sail-gray-600">Phase 2 · 강제 선택</span>
              <span className="text-caption text-sail-gray-500">14 / 30</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-pill bg-sail-gray-100">
              <div className="h-full rounded-pill bg-sail-orange transition-all" style={{ width: '46.6%' }} />
            </div>
          </div>

          <Sub>5.5 진단 카드 미리보기 (Phase 2 강제 선택)</Sub>
          <div className="rounded-question border border-sail-gray-200 bg-white p-8 shadow-card">
            <p className="mb-2 text-caption font-medium uppercase tracking-wide text-sail-orange">
              Q14 · 의사결정 속도
            </p>
            <h3 className="mb-6 text-h3 font-bold text-sail-gray-900">
              두 카드 중 더 가까운 쪽을 선택하세요
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <button className="group flex flex-col items-start gap-3 rounded-card border-2 border-sail-gray-200 bg-white p-6 text-left transition-all hover:border-sail-navy hover:shadow-card-hover">
                <span className="text-4xl">⚡</span>
                <span className="text-h4 font-bold text-sail-gray-900">빠른 결정, 빠른 수정</span>
                <span className="text-bodySm text-sail-gray-600">70%면 실행한다. 나머지는 가면서 고친다.</span>
              </button>
              <button className="group flex flex-col items-start gap-3 rounded-card border-2 border-sail-gray-200 bg-white p-6 text-left transition-all hover:border-sail-navy hover:shadow-card-hover">
                <span className="text-4xl">🔍</span>
                <span className="text-h4 font-bold text-sail-gray-900">충분한 검토, 한 번의 결정</span>
                <span className="text-bodySm text-sail-gray-600">한 번 잘 결정하면 고칠 일이 없다. 충분히 검토가 결국 더 빠르다.</span>
              </button>
            </div>
          </div>
        </Section>

        <footer className="py-10 text-center text-caption text-sail-gray-500">
          SAIL Design System v1.0 · 2026-05-28 · 본 페이지는 SAIL_DESIGN_SYSTEM.md의 시각적 짝이다.
        </footer>
      </div>
    </div>
  );
}

// ============================================================
// 보조 컴포넌트 — 이 파일 안에서만 사용
// ============================================================

function Section({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-card bg-white p-8 shadow-card">
      <h2 className="mb-1 text-h2 font-bold text-sail-navy">{title}</h2>
      <p className="mb-6 text-bodySm text-sail-gray-600">{desc}</p>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 text-h4 font-semibold text-sail-gray-800">
      {children}
    </h3>
  );
}

function Swatch({
  name,
  hex,
  bgClass,
  emoji,
  textDark = false,
}: {
  name: string;
  hex: string;
  bgClass: string;
  emoji?: string;
  textDark?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-sail-gray-200 shadow-card">
      <div
        className={`${bgClass} flex h-20 items-end justify-between p-3`}
        aria-label={name}
      >
        {emoji && <span className="text-2xl">{emoji}</span>}
        <span
          className={`ml-auto text-tiny font-medium ${textDark ? 'text-sail-gray-700' : 'text-white/80'}`}
        >
          AA
        </span>
      </div>
      <div className="bg-white p-3">
        <div className="text-bodySm font-semibold text-sail-gray-800">{name}</div>
        <div className="font-mono text-tiny text-sail-gray-500">{hex}</div>
      </div>
    </div>
  );
}

function TypeRow({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-6 py-3">
      <span className="min-w-[140px] text-tiny font-medium uppercase tracking-wide text-sail-gray-400">
        {label}
      </span>
      <span className={className}>{children}</span>
    </div>
  );
}

function Card({ title, stat, label }: { title: string; stat: string; label: string }) {
  return (
    <div className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card transition-all hover:border-sail-gray-300 hover:shadow-card-hover">
      <div className="text-h4 font-bold text-sail-navy">{title}</div>
      <div className="my-2 text-display font-bold text-sail-navy">{stat}</div>
      <div className="text-caption text-sail-gray-500">{label}</div>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-tiny font-semibold text-white ${className ?? ''}`}
    >
      {children}
    </span>
  );
}

function Alert({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: 'bg-sky-50 border-sail-info text-sky-900',
    success: 'bg-emerald-50 border-sail-success text-emerald-900',
    warning: 'bg-amber-50 border-sail-warning text-amber-900',
    danger: 'bg-red-50 border-sail-danger text-red-900',
  } as const;
  return (
    <div className={`rounded-alert border-l-4 px-5 py-4 ${tones[tone]}`}>
      <div className="mb-1 text-bodySm font-semibold">{title}</div>
      <div className="text-bodySm opacity-90">{children}</div>
    </div>
  );
}
