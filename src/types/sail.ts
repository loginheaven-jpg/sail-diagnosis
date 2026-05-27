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
  tagline: string; // 한 줄 요약
  color: string; // 대표 색상 hex
  emoji: string;
  metaphor: string;
}

export const SAIL_TYPES: Record<SailType, SailTypeInfo> = {
  S: {
    type: 'S',
    englishName: 'Skipper',
    koreanName: '선장',
    tagline: '목적지를 정하고 키를 잡는다',
    color: '#1E3A5F',
    emoji: '⚓',
    metaphor: '배의 방향을 결정하고 키를 잡는 사람. 폭풍이 와도 키를 놓지 않는다.',
  },
  A: {
    type: 'A',
    englishName: 'Adventurer',
    koreanName: '모험가',
    tagline: '새 항로를 찾고 선원을 고무한다',
    color: '#F28C38',
    emoji: '🌅',
    metaphor: '미지의 바다를 탐험하며 에너지를 전파하는 사람. 새 항로를 발견하면 신나게 외친다.',
  },
  I: {
    type: 'I',
    englishName: 'Interpreter',
    koreanName: '해석가',
    tagline: '해도를 읽고 최적 경로를 찾는다',
    color: '#6B3FA0',
    emoji: '🔭',
    metaphor: '별자리와 해류를 해석하여 항로를 계산하는 사람. 그의 분석이 없으면 배는 표류한다.',
  },
  L: {
    type: 'L',
    englishName: 'Lifeguard',
    koreanName: '수호자',
    tagline: '모든 선원의 안전과 사기를 돌본다',
    color: '#2E9E6B',
    emoji: '🛟',
    metaphor: '선원 한 명 한 명의 컨디션을 챙긴다. 그가 없으면 긴 항해에서 팀이 와해된다.',
  },
} as const;

export const SAIL_TYPE_LIST = ['S', 'A', 'I', 'L'] as const;

// ============================================================
// 2. 문항 타입
// ============================================================
export type Phase = 1 | 2 | 3;
export type QuestionCategory = 'coaching' | 'general';
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
  /** 정규화된 자기주장성 [-1, +1] (양수 = 높은 주장성) */
  i: number;
  /** 정규화된 감정반응성 [-1, +1] (양수 = 높은 반응성) */
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
  sessionCode: string | null;
  answers: AnswerRecord;
  device?: string;
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
  S: { i: +0.5, s: -0.5 }, // 높은 주장, 낮은 반응
  A: { i: +0.5, s: +0.5 }, // 높은 주장, 높은 반응
  I: { i: -0.5, s: -0.5 }, // 낮은 주장, 낮은 반응
  L: { i: -0.5, s: +0.5 }, // 낮은 주장, 높은 반응
} as const;
