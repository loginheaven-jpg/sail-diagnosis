/**
 * SAIL Design Tokens
 *
 * 본 파일은 SAIL_DESIGN_SYSTEM.md (작업 루트)의 코드화된 형태이다.
 * 디자인 결정을 코드에 박지 말고 본 파일을 import 하여 참조한다.
 *
 * Single source of truth (runtime JS access). Tailwind 클래스 생성은
 * globals.css 의 @theme 블록을 통해 이루어진다.
 */

export const sailTokens = {
  // ============================================================
  // 1. SAIL Type Colors — 4유형 도메인 색상 (도메인의 핵심)
  // ============================================================
  type: {
    S: { hex: '#1E3A5F', name: 'Skipper', korean: '선장', emoji: '⚓' },
    A: { hex: '#F28C38', name: 'Adventurer', korean: '모험가', emoji: '🌅' },
    I: { hex: '#6B3FA0', name: 'Interpreter', korean: '해석가', emoji: '🔭' },
    L: { hex: '#2E9E6B', name: 'Lifeguard', korean: '수호자', emoji: '🛟' },
  },

  // ============================================================
  // 2. Primary / System Colors
  // ============================================================
  colors: {
    // Primary Navy (S형과 공유. 시스템 Primary)
    primary: '#1E3A5F',
    primaryLight: '#2D4F7B',
    primaryDark: '#14283F',
    primaryBg: '#EFF3F8',

    // Accent Orange (A형과 공유. CTA용)
    accent: '#F28C38',
    accentHover: '#DC7A2A',
    accentBg: '#FFF4E6',

    // Neutrals (Slate scale)
    white: '#FFFFFF',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1E293B',
    gray900: '#0F172A',

    // Semantic
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
    info: '#0EA5E9',

    // Compass quadrant tints (사분면 배경, 6% alpha)
    quadrantS: 'rgba(30, 58, 95, 0.06)',
    quadrantA: 'rgba(242, 140, 56, 0.06)',
    quadrantI: 'rgba(107, 63, 160, 0.06)',
    quadrantL: 'rgba(46, 158, 107, 0.06)',
  },

  // ============================================================
  // 3. Typography
  // ============================================================
  typography: {
    fontFamily: {
      sans: "'Pretendard Variable', 'Pretendard', system-ui, -apple-system, sans-serif",
      mono: "'Geist Mono', 'Consolas', monospace",
    },
    fontSize: {
      display: '32px',
      h1: '28px',
      h2: '24px',
      h3: '20px',
      h4: '18px',
      bodyLg: '16px',
      body: '15px', // ★ 기본 본문
      bodySm: '14px',
      caption: '13px',
      tiny: '12px',
    },
    lineHeight: {
      display: 1.25,
      heading: 1.35,
      body: 1.6,
      tight: 1.4,
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
    },
  },

  // ============================================================
  // 4. Spacing
  // ============================================================
  spacing: {
    // 시맨틱 alias (Tailwind 기본 4px 스케일 위에)
    tight: '8px',       // gap-2
    snug: '12px',       // gap-3
    default: '16px',    // gap-4
    loose: '24px',      // gap-6
    section: '32px',    // gap-8
    page: '48px',       // gap-12

    // 컴포넌트별
    cardPadding: '24px',
    questionCardPadding: '32px',
    topBarHeight: '60px',
    contentMaxWidth: '720px',
    pageMaxWidth: '1200px',
  },

  // ============================================================
  // 5. Effects (border-radius, shadow)
  // ============================================================
  radius: {
    sm: '6px',
    md: '10px',     // 버튼, 인풋
    lg: '12px',     // 알림, 모달 내부
    xl: '16px',     // 카드 (rounded-2xl)
    xxl: '20px',    // QuestionCard, Modal 외곽
    pill: '999px',  // 배지
  },

  shadow: {
    xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
    sm: '0 1px 3px rgba(15, 23, 42, 0.06)',
    md: '0 4px 16px rgba(15, 23, 42, 0.10)',
    lg: '0 16px 48px rgba(15, 23, 42, 0.18)',
    focus: '0 0 0 3px rgba(30, 58, 95, 0.12)',
    focusDanger: '0 0 0 3px rgba(220, 38, 38, 0.12)',
  },

  // ============================================================
  // 6. Motion
  // ============================================================
  motion: {
    duration: {
      fast: '150ms',
      default: '200ms',
      slow: '300ms',
      deliberate: '400ms',
    },
    easing: {
      out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  // ============================================================
  // 7. Z-index Layers
  // ============================================================
  zIndex: {
    base: 0,
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

/** 유형 코드로 색상·정보를 조회 */
export function getTypeInfo(type: SailType): SailTypeInfo {
  return sailTokens.type[type];
}
