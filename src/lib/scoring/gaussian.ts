/**
 * 가우시안 확률 기반 4유형 판정
 *
 * 알고리즘 (SAIL_진단_문항설계서 § 5.3, σ = 0.7):
 *   각 유형의 중심점(±0.5, ±0.5)에서의 거리를 기준으로 정규분포 확률을 계산.
 *   네 유형의 확률을 합해 1이 되도록 정규화하여 % 분포로 반환.
 *
 * 강도(intensity): 원점에서의 거리 √(i² + s²), [0, 1] 클램프.
 */

import {
  GAUSSIAN_SIGMA,
  TYPE_CENTERS,
  type DiagnosisResult,
  type NormalizedScores,
  type SailType,
  type TypeProbabilities,
} from '@/types/sail';

const TWO_SIGMA_SQ = 2 * GAUSSIAN_SIGMA * GAUSSIAN_SIGMA; // 0.98

function gaussianProbability(
  point: NormalizedScores,
  center: { i: number; s: number }
): number {
  const di = point.i - center.i;
  const ds = point.s - center.s;
  return Math.exp(-(di * di + ds * ds) / TWO_SIGMA_SQ);
}

/** 4유형의 확률 분포(%)를 계산. 합은 100. */
export function calculateProbabilities(
  scores: NormalizedScores
): TypeProbabilities {
  const raw: Record<SailType, number> = {
    S: gaussianProbability(scores, TYPE_CENTERS.S),
    A: gaussianProbability(scores, TYPE_CENTERS.A),
    I: gaussianProbability(scores, TYPE_CENTERS.I),
    L: gaussianProbability(scores, TYPE_CENTERS.L),
  };

  const total = raw.S + raw.A + raw.I + raw.L;
  if (total === 0) {
    // 이론상 불가능하지만 방어
    return { S: 25, A: 25, I: 25, L: 25 };
  }

  // 소수점 1자리로 반올림
  const round = (v: number) => Math.round((v / total) * 1000) / 10;
  return {
    S: round(raw.S),
    A: round(raw.A),
    I: round(raw.I),
    L: round(raw.L),
  };
}

/**
 * 최종 진단 결과 생성
 *
 * @param scores - 정규화된 (i, s) 좌표
 * @param consistencyScore - 0~100 일관성 점수
 */
export function diagnose(
  scores: NormalizedScores,
  consistencyScore: number
): DiagnosisResult {
  const probabilities = calculateProbabilities(scores);

  // 주 / 부 유형 (확률 내림차순)
  const sorted = (['S', 'A', 'I', 'L'] as SailType[])
    .map((t) => ({ type: t, pct: probabilities[t] }))
    .sort((a, b) => b.pct - a.pct);

  const dominantType = sorted[0].type;
  const secondaryType = sorted[1].type;
  const dominantPct = sorted[0].pct;

  // 강도: 원점에서의 거리
  const intensity = Math.min(
    1,
    Math.sqrt(scores.i * scores.i + scores.s * scores.s)
  );

  // 라벨 산정
  let label: string;
  if (dominantPct >= 50) {
    label = `명확한 ${dominantType}형`;
  } else if (dominantPct >= 40) {
    label = `${dominantType}형 경향 (${dominantType}/${secondaryType} 혼합)`;
  } else {
    label = `균형잡힌 혼합형 (${dominantType}+${secondaryType})`;
  }
  if (intensity < 0.3) {
    label += ' — 아직 뚜렷한 스타일이 형성되지 않은 상태';
  }

  return {
    scores,
    probabilities,
    dominantType,
    secondaryType,
    intensity,
    consistencyScore,
    label,
  };
}
