/**
 * SAIL 도메인 타입 정의
 *
 * 단일 원천:
 *   - 4유형 색상/이름은 본 파일과 src/styles/tokens.ts 에 중복 정의되어 있으나,
 *     색상값은 globals.css @theme 에서 Tailwind 클래스로도 노출된다.
 *     변경 시 3곳을 모두 동기화한다.
 *   - 문항 데이터 형식은 SAIL_진단_문항설계서_30문항.md 의 채점 규칙에 묶여 있다.
 */

// ============================================================
// 1. SAIL 유형
// ============================================================
export type SailType = 'S' | 'A' | 'I' | 'L';

export interface SailTypeInfo {
  type: SailType;
  englishName: string; // Skipper, Adventurer, Interpreter, Lifeguard
  koreanName: string; // 선장, 모험가, 해석가, 수호자
  /** 두 축 조합 라벨 — 'Tell + Control' 등 */
  axisCombo: string;
  tagline: string; // 한 줄 정의
  color: string; // 대표 색상 hex
  emoji: string;
  metaphor: string;
}

export const SAIL_TYPES: Record<SailType, SailTypeInfo> = {
  S: {
    type: 'S',
    englishName: 'Skipper',
    koreanName: '선장',
    axisCombo: 'Tell + Control',
    tagline: '방향을 정하고 흔들림 없이 이끄는 사람',
    color: '#1E3A5F',
    emoji: '⚓',
    metaphor:
      '폭풍이 와도 감정에 흔들리지 않고 키를 잡는 사람. 목적지를 선언하고 단호하게 이끈다.',
  },
  A: {
    type: 'A',
    englishName: 'Adventurer',
    koreanName: '모험가',
    axisCombo: 'Tell + Emote',
    tagline: '새 방향을 제시하고 열정으로 사람을 움직이는 사람',
    color: '#F28C38',
    emoji: '🌅',
    metaphor:
      '"저기로 가자!"고 먼저 외치며, 흥분과 열정을 숨기지 않아 선원들이 따라 움직이게 만드는 사람.',
  },
  I: {
    type: 'I',
    englishName: 'Interpreter',
    koreanName: '해석가',
    axisCombo: 'Ask + Control',
    tagline: '충분히 묻고 수집하여 냉정하게 최적해를 찾는 사람',
    color: '#6B3FA0',
    emoji: '🔭',
    metaphor:
      '끊임없이 질문하고 데이터를 모아 냉정하게 항로를 계산하는 사람. 그의 분석이 없으면 배는 표류한다.',
  },
  L: {
    type: 'L',
    englishName: 'Lifeguard',
    koreanName: '수호자',
    axisCombo: 'Ask + Emote',
    tagline: '먼저 듣고 마음을 나누며 모두의 안녕을 지키는 사람',
    color: '#2E9E6B',
    emoji: '🛟',
    metaphor:
      '"괜찮아?" 먼저 물으며 다가가고, 자기 마음도 솔직히 나누어 선원들이 마음을 열게 하는 사람.',
  },
} as const;

export const SAIL_TYPE_LIST = ['S', 'A', 'I', 'L'] as const;

// ============================================================
// 1.1 두 축 메타데이터 (한국어 UI 라벨)
//   DB 컬럼·변수명은 영문 그대로(assertiveness/responsiveness).
//   한국어 라벨은 UI에서만 사용한다.
// ============================================================
export const AXIS_LABELS = {
  assertiveness: {
    korean: '주도성',
    spectrum: 'Ask ↔ Tell',
    positive: 'Tell', // i > 0
    negative: 'Ask', // i < 0
  },
  responsiveness: {
    korean: '감정표현성',
    spectrum: 'Control ↔ Emote',
    positive: 'Emote', // s > 0
    negative: 'Control', // s < 0
  },
} as const;

// ============================================================
// 2. 문항 타입
// ============================================================
export type Phase = 1 | 2 | 3;
/**
 * 컨셉 v3에서 코칭 맥락은 모두 제거됨 (진단 대상은 일반 조직 구성원).
 * 문항 세부 맥락(직장/조직·공동체/개인·일상)은 별도 라벨로 표시하되,
 * 도메인 분류는 단일 'general' 카테고리만 유지한다.
 */
export type QuestionCategory = 'workplace' | 'community' | 'personal';
export type Axis = 'assertiveness' | 'responsiveness';

// Phase 1: 시나리오 (4지선다)
export interface ScenarioChoice {
  key: 'a' | 'b' | 'c' | 'd';
  text: string;
  targetType: SailType;
  assertiveness: number; // -3 ~ +3
  responsiveness: number; // -3 ~ +3
}

export interface ScenarioQuestion {
  id: string; // 'Q1' ~ 'Q10'
  phase: 1;
  category: QuestionCategory;
  situation: string;
  isReverse: boolean;
  choices: ScenarioChoice[];
}

// Phase 2: 강제 선택 (2장 택1)
export interface ChoiceCard {
  emoji: string;
  title: string;
  description: string;
  scoreIfSelected: number; // +3 또는 -3 (해당 축)
}

export interface ChoiceQuestion {
  id: string; // 'Q11' ~ 'Q20'
  phase: 2;
  category: QuestionCategory;
  axis: Axis;
  isReverse: boolean;
  cardA: ChoiceCard;
  cardB: ChoiceCard;
  scoreIfNotSelected: number; // -1 (비선택 카드)
}

// Phase 3: 스펙트럼 (슬라이더)
export interface SpectrumQuestion {
  id: string; // 'Q21' ~ 'Q30'
  phase: 3;
  category: QuestionCategory;
  axis: Axis;
  /** Phase 3는 역채점 없음. 타입 union narrowing 일관성을 위해 항상 false. */
  isReverse: false;
  leftLabel: string;
  rightLabel: string;
  leftEmoji: string;
  rightEmoji: string;
  /** 왼쪽(0)이 해당 축의 높은쪽인지 낮은쪽인지 */
  leftDirection: 'high' | 'low';
}

export type Question = ScenarioQuestion | ChoiceQuestion | SpectrumQuestion;

// ============================================================
// 3. 응답 / 채점 결과
// ============================================================

/**
 * Q1~Q10: 'a'|'b'|'c'|'d'
 * Q11~Q20: 'cardA'|'cardB'
 * Q21~Q30: number (0~100)
 */
export type AnswerValue = 'a' | 'b' | 'c' | 'd' | 'cardA' | 'cardB' | number;

export type AnswerRecord = Partial<Record<string, AnswerValue>>;

export interface ScoreState {
  assertivenessRaw: number;
  responsivenessRaw: number;
}

export interface NormalizedScores {
  /** 정규화된 주도성 [-1, +1] (i > 0 = Tell 우세, i < 0 = Ask 우세) */
  i: number;
  /** 정규화된 감정표현성 [-1, +1] (s > 0 = Emote 우세, s < 0 = Control 우세) */
  s: number;
}

export interface TypeProbabilities {
  S: number; // 0~100
  A: number;
  I: number;
  L: number;
}

export interface DiagnosisResult {
  scores: NormalizedScores;
  probabilities: TypeProbabilities;
  dominantType: SailType;
  secondaryType: SailType;
  /** 강도 0~1 — 원점에서의 거리 */
  intensity: number;
  /** 일관성 0~100 */
  consistencyScore: number;
  label: string;
}

// ============================================================
// 4. 진단 진행 상태 (Zustand store에서 사용)
// ============================================================
export interface TestProgress {
  phase: Phase;
  questionIndex: number; // 현재 Phase 내 인덱스 0~9
  nickname: string;
  sessionCode: string | null;
  isStarted: boolean;
  isCompleted: boolean;
  answers: AnswerRecord;
  result: DiagnosisResult | null;
}

// ============================================================
// 5. 진단 결과 저장 요청 payload (POST /api/diagnosis)
// ============================================================
export interface DiagnosisSavePayload {
  nickname: string;
  /** 그룹 가입 코드 (5자리, 선택). 서버에서 group_id로 변환됨. */
  groupCode: string | null;
  answers: AnswerRecord;
  device?: string;
}

// ============================================================
// 6. 그룹 시스템 (Phase 7)
// ============================================================

/** 그룹 코드 형식: 5자리 영숫자 (혼동 글자 0/O/1/I/L 제외) */
export const GROUP_CODE_ALPHABET =
  'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31자
export const GROUP_CODE_LENGTH = 5;
export const GROUP_CODE_REGEX = new RegExp(
  `^[${GROUP_CODE_ALPHABET}]{${GROUP_CODE_LENGTH}}$`
);

/** 랜덤 5자리 그룹 코드 생성 — 충돌 가능성 있으므로 호출 측에서 retry 처리 */
export function generateGroupCode(): string {
  let code = '';
  for (let i = 0; i < GROUP_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * GROUP_CODE_ALPHABET.length);
    code += GROUP_CODE_ALPHABET[idx];
  }
  return code;
}

/** 입력값 정규화 — 대문자로 통일, 공백 제거 */
export function normalizeGroupCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-_]/g, '');
}

// ============================================================
// 6. 유틸 — 채점 알고리즘 상수
// ============================================================

/** 축당 이론적 최대값 (Phase 1: ±30, Phase 2: ±15, Phase 3: ±50) */
export const MAX_RAW_SCORE = 95;

/** 가우시안 σ */
export const GAUSSIAN_SIGMA = 0.7;

/** 4유형의 중심점 (정규화 좌표계에서) */
export const TYPE_CENTERS: Record<SailType, { i: number; s: number }> = {
  S: { i: +0.5, s: -0.5 }, // Tell + Control
  A: { i: +0.5, s: +0.5 }, // Tell + Emote
  I: { i: -0.5, s: -0.5 }, // Ask + Control
  L: { i: -0.5, s: +0.5 }, // Ask + Emote
} as const;
