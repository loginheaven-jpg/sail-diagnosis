/**
 * Zustand 진단 진행 상태 스토어
 *
 * 30문항의 진행 상태(현재 Phase, 문항 인덱스, 응답, 닉네임 등)를 보관.
 *
 * 저장소 정책 (사용자 데이터 보호):
 *   - localStorage 사용 — 탭/브라우저를 닫고 다시 와도 진단 도중 데이터가 살아있다.
 *   - "sail-test-progress" 키 하나에 통합 저장.
 *   - 진단 완료 + 서버 저장 성공 시점에 reset() 호출로 명시적 정리.
 *     (안 그러면 다음 진단 시작 시 이전 답안이 끌려옴)
 *
 * 채점은 calculator/gaussian/consistency 모듈에 위임.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { calculateRawScores, normalize } from '@/lib/scoring/calculator';
import { calculateConsistency } from '@/lib/scoring/consistency';
import { diagnose } from '@/lib/scoring/gaussian';
import type {
  AnswerRecord,
  AnswerValue,
  DiagnosisResult,
  Phase,
} from '@/types/sail';

interface TestState {
  // 진행 상태
  phase: Phase;
  /** 현재 Phase 내의 문항 인덱스 (0~9) */
  questionIndex: number;
  nickname: string;
  /** 그룹 가입 코드 (5자리 영숫자, 선택) */
  groupCode: string | null;
  isStarted: boolean;
  isCompleted: boolean;

  // 응답
  answers: AnswerRecord;

  // 계산된 결과 (로컬 — API 저장 전 미리보기용)
  result: DiagnosisResult | null;

  // === 액션 ===
  setNickname: (name: string) => void;
  setGroupCode: (code: string | null) => void;
  startTest: () => void;
  answerQuestion: (questionId: string, answer: AnswerValue) => void;
  nextQuestion: () => void;
  /** 현재 Phase 완료 → 다음 Phase 또는 종료 */
  completePhase: () => void;
  /** 현재 응답으로 결과를 계산하여 반환 + state 저장 */
  calculateResult: () => DiagnosisResult;
  reset: () => void;
}

const initialState = {
  phase: 1 as Phase,
  questionIndex: 0,
  nickname: '',
  groupCode: null,
  isStarted: false,
  isCompleted: false,
  answers: {} as AnswerRecord,
  result: null,
};

export const useTestStore = create<TestState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setNickname: (name) => set({ nickname: name }),
      setGroupCode: (code) => set({ groupCode: code }),

      startTest: () =>
        set({ isStarted: true, isCompleted: false, phase: 1, questionIndex: 0, result: null }),

      answerQuestion: (questionId, answer) => {
        set((state) => ({
          answers: { ...state.answers, [questionId]: answer },
        }));
      },

      nextQuestion: () => {
        const { questionIndex } = get();
        if (questionIndex < 9) {
          set({ questionIndex: questionIndex + 1 });
        }
      },

      completePhase: () => {
        const { phase } = get();
        if (phase < 3) {
          set({ phase: (phase + 1) as Phase, questionIndex: 0 });
        } else {
          const result = get().calculateResult();
          set({ isCompleted: true, result });
        }
      },

      calculateResult: () => {
        const { answers } = get();
        const raw = calculateRawScores(answers);
        const normalized = normalize(raw);
        const consistency = calculateConsistency(answers);
        return diagnose(normalized, consistency);
      },

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'sail-test-progress',
      storage: createJSONStorage(() => {
        // SSR-safe: 브라우저에서만 localStorage 사용, 서버에서는 메모리 fallback.
        // localStorage이므로 탭/브라우저를 닫아도 진단 도중 응답이 살아있다.
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return localStorage;
      }),
      // 완료 후 결과 객체까지 persist (새로고침해도 결과 유지)
      partialize: (state) => ({
        phase: state.phase,
        questionIndex: state.questionIndex,
        nickname: state.nickname,
        groupCode: state.groupCode,
        isStarted: state.isStarted,
        isCompleted: state.isCompleted,
        answers: state.answers,
        result: state.result,
      }),
    }
  )
);
