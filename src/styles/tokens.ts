/**
 * SAIL Design Tokens v2.0 — Quiet Luxury
 *
 * 단일 원천: SAIL_DESIGN_SYSTEM.md (작업 루트)
 * 컨셉: 심해 네이비 다크 + 황동 골드 + 세리프 듀얼 폰트
 *
 * v1.0의 라이트 모드 토큰은 폐기됨. 본 파일이 정의하는 토큰만 사용한다.
 * Tailwind 클래스 생성은 globals.css 의 @theme 블록을 통해 이루어진다.
 */

export const sailTokens = {
  // ============================================================
  // 1. SAIL Type Colors — 4유형 (다크 배경 최적화)
  // ============================================================
  type: {
    S: { hex: '#F4EFE6', surface: '#1E3A5F', name: 'Skipper', korean: '선장', emoji: '⚓' },
    A: { hex: '#F28C38', surface: '#F28C38', name: 'Adventurer', korean: '모험가', emoji: '🌅' },
    I: { hex: '#9B7BC9', surface: '#9B7BC9', name: 'Interpreter', korean: '해석가', emoji: '🔭' },
    L: { hex: '#3DB389', surface: '#3DB389', name: 'Lifeguard', korean: '수호자', emoji: '🛟' },
  },

  // ============================================================
  // 2. Quiet Luxury 코어 팔레트
  // ============================================================
  colors: {
    abyss: '#0A1628', // 가장 깊은 바다 — 페이지 기본 배경
    deep: '#0F2438', // 깊은 네이비 — 카드/표면
    navy: '#1E3A5F', // S형 네이비 — 중간 강조
    slate: '#2A4D6E', // 중간 톤 — 보더/구분
    gold: '#C9A227', // 황동 골드 — 주 악센트, CTA
    goldSoft: '#E0C977', // 밝은 골드 — 제목 강조, 호버
    mist: '#A9BBD0', // 안개빛 — 보조 텍스트
    paper: '#F4EFE6', // 해도 미색 — 본문/제목 텍스트
    foam: '#7FD4D0', // 물거품 청록 — 나침반 영역 악센트

    // 4유형 보조 (다크 배경용 밝기 보정)
    orange: '#F28C38',
    purple: '#9B7BC9',
    green: '#3DB389',

    // Semantic — 다크 배경용 밝은 톤
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    info: '#38BDF8',

    // Compass quadrant tints (사분면 배경, 매우 옅은 alpha)
    quadrantS: 'rgba(244, 239, 230, 0.04)',
    quadrantA: 'rgba(242, 140, 56, 0.06)',
    quadrantI: 'rgba(155, 123, 201, 0.06)',
    quadrantL: 'rgba(61, 179, 137, 0.06)',
  },

  // ============================================================
  // 3. Typography — 듀얼 세리프 시스템
  // ============================================================
  typography: {
    fontFamily: {
      // 디스플레이용 영문 세리프 (제목, 영문 라벨, 이탤릭 강조)
      serif:
        "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
      // 한글 본문/제목용 명조 세리프
      korean:
        "'Gowun Batang', 'Nanum Myeongjo', Georgia, serif",
      // 모노
      mono: "'Geist Mono', 'Consolas', monospace",
    },
    fontSize: {
      hero: '64px', // Cormorant 500 line 1.12
      display: '44px', // Cormorant 500 line 1.2
      h1: '34px', // Cormorant 500 line 1.25
      h2: '24px', // Cormorant 600 line 1.35
      h3: '20px', // 고운바탕 700 line 1.4
      bodyLg: '18px', // 고운바탕 400 line 1.8
      body: '16px', // 고운바탕 400 line 1.75 ★기본
      bodySm: '14.5px', // 고운바탕 400 line 1.7
      caption: '13px', // 고운바탕 400 line 1.5
      label: '11px', // Cormorant 600 ls 0.28em — 영문 라벨 (최소 하한)
      axis: '10.5px', // 사분면 축 라벨 (절대 하한)
    },
    lineHeight: {
      hero: 1.12,
      display: 1.2,
      heading: 1.35,
      body: 1.75,
      bodyLg: 1.8,
      tight: 1.4,
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    letterSpacing: {
      tighter: '-0.01em', // hero
      tight: '-0.005em', // display
      normal: '0',
      label: '0.28em', // 영문 라벨 대문자
      mark: '0.3em', // 브랜드 마크 (SAIL)
    },
  },

  // ============================================================
  // 4. Spacing — 넉넉한 여백이 핵심
  // ============================================================
  spacing: {
    tight: '8px',
    snug: '12px',
    default: '16px',
    loose: '24px',
    section: '60px',
    page: '100px', // 데스크탑 섹션 간
    pageMobile: '70px',
    cardPadding: '34px',
    cardPaddingY: '26px',
    questionCardPadding: '36px',
    topBarHeight: '88px',
    contentMaxWidth: '720px',
    pageMaxWidth: '1180px',
    containerPaddingX: '32px',
    containerPaddingXMobile: '22px',
  },

  // ============================================================
  // 5. Radius — 정제된 모서리 (둥근 모서리 금지)
  // ============================================================
  radius: {
    btn: '2px', // 버튼/구분선
    card: '3px', // 카드/유형 카드
    modal: '4px', // 모달/문항 카드
    pill: '999px', // 배지
    none: '0',
  },

  // ============================================================
  // 6. Shadow / Glow
  // ============================================================
  shadow: {
    gold: '0 8px 30px -8px rgba(201, 162, 39, 0.5)', // 골드 CTA
    goldHover: '0 14px 40px -8px rgba(201, 162, 39, 0.65)',
    modal: '0 24px 60px rgba(0, 0, 0, 0.5)',
    compass: '0 0 50px rgba(127, 212, 208, 0.16)',
    focusGold: '0 0 0 2px #E0C977',
  },

  // ============================================================
  // 7. Motion
  // ============================================================
  motion: {
    duration: {
      fast: '150ms',
      default: '200ms',
      slow: '300ms', // 카드 전환
      deliberate: '400ms', // 결과 stagger
      rise: '900ms', // 페이지 로드 staggered rise
    },
    easing: {
      // ease-out: cubic-bezier(.2, .7, .3, 1) — v2.0 표준
      out: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
      btn: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
    },
    compassSpin: '72s', // 다이얼 1회전
    rippleCycle: '6s', // 물결 1주기
  },

  // ============================================================
  // 8. Z-index
  // ============================================================
  zIndex: {
    atmosphere: 0,
    grain: 1,
    base: 2,
    topbar: 50,
    dropdown: 60,
    modal: 100,
    toast: 200,
    tooltip: 300,
  },
} as const;

// ============================================================
// Type-safe re-exports
// ============================================================
export const typeColors = sailTokens.type;
export const colors = sailTokens.colors;
export const typography = sailTokens.typography;
export const spacing = sailTokens.spacing;
export const radius = sailTokens.radius;
export const shadow = sailTokens.shadow;
export const motion = sailTokens.motion;

export type SailType = keyof typeof sailTokens.type;
export type SailTypeInfo = (typeof sailTokens.type)[SailType];

/** 유형 코드로 색상/정보를 조회 */
export function getTypeInfo(type: SailType): SailTypeInfo {
  return sailTokens.type[type];
}
