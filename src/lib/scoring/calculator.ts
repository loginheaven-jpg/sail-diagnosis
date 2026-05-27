/**
 * 점수 누적 + 정규화
 *
 * 알고리즘 (SAIL_진단_문항설계서 § 5):
 *   Phase 1: 선택지의 (assertiveness, responsiveness)를 그대로 가산
 *   Phase 2: 선택 카드 ±3, 비선택 카드 -1
 *   Phase 3: (sliderValue - 50) × 0.2, leftDirection에 따라 부호 적용
 *
 * 정규화: raw / MAX_RAW_SCORE → [-1, +1]
 */

import { questions } from '@/data/questions';
import type { AnswerRecord, NormalizedScores, ScoreState } from '@/types/sail';
import { MAX_RAW_SCORE } from '@/types/sail';

/** 전체 응답으로부터 원시 (assertiveness, responsiveness) 점수를 계산 */
export function calculateRawScores(answers: AnswerRecord): ScoreState {
  let a = 0; // assertiveness 누적
  let r = 0; // responsiveness 누적

  for (const q of questions) {
    const answer = answers[q.id];
    if (answer === undefined) continue;

    if (q.phase === 1) {
      // 4지선다 — 선택지의 (a, r) 점수를 그대로 가산
      const choice = q.choices.find((c) => c.key === answer);
      if (choice) {
        a += choice.assertiveness;
        r += choice.responsiveness;
      }
      continue;
    }

    if (q.phase === 2) {
      // 강제 선택 — 선택 ±3, 비선택 -1
      const selectedScore =
        answer === 'cardA' ? q.cardA.scoreIfSelected : q.cardB.scoreIfSelected;
      const notSelectedScore = q.scoreIfNotSelected;

      if (q.axis === 'assertiveness') {
        a += selectedScore + notSelectedScore;
      } else {
        r += selectedScore + notSelectedScore;
      }
      continue;
    }

    if (q.phase === 3) {
      // 슬라이더 — (값-50)*0.2 → ±10
      const sliderValue = typeof answer === 'number' ? answer : 50;
      const clamped = Math.max(0, Math.min(100, sliderValue));
      const contribution = (clamped - 50) * 0.2;
      // leftDirection === 'high' : 왼쪽(0)이 해당 축의 높은쪽 → 슬라이더가 낮을수록 점수↑
      // contribution이 음수(왼쪽)일 때 축 점수 증가 → -contribution 가산
      const signed = q.leftDirection === 'high' ? -contribution : contribution;

      if (q.axis === 'assertiveness') {
        a += signed;
      } else {
        r += signed;
      }
      continue;
    }
  }

  return { assertivenessRaw: a, responsivenessRaw: r };
}

/** raw 점수를 [-1, +1] 범위로 정규화 */
export function normalize(raw: ScoreState): NormalizedScores {
  return {
    i: clamp(raw.assertivenessRaw / MAX_RAW_SCORE, -1, 1),
    s: clamp(raw.responsivenessRaw / MAX_RAW_SCORE, -1, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
