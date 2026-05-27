/**
 * 응답 일관성 검증
 *
 * 역채점 문항(Q7, Q10, Q15, Q20)이 동일 축의 정방향 문항과
 * 같은 방향으로 응답되었는지 점수화한다.
 *
 * 방식:
 *   - Q7  (Phase 1, 양축): 정방향 Phase 1에서 가장 많이 선택된 유형과 일치하는지
 *   - Q10 (Phase 1, 양축): 동일
 *   - Q15 (Phase 2, R축): 정방향 R축 카드 A 선호 여부와 일치하는지
 *   - Q20 (Phase 2, A축): 정방향 A축 카드 A 선호 여부와 일치하는지
 *
 * 결과:
 *   - ≥ 75% : 양호
 *   - 50~74% : 경고
 *   - < 50%  : 재진단 권유
 */

import { questions } from '@/data/questions';
import type {
  AnswerRecord,
  ChoiceQuestion,
  SailType,
  ScenarioQuestion,
} from '@/types/sail';

export function calculateConsistency(answers: AnswerRecord): number {
  const reverseQs = questions.filter((q) => q.isReverse);
  if (reverseQs.length === 0) return 100;

  let consistent = 0;
  let checked = 0;

  for (const rq of reverseQs) {
    const answer = answers[rq.id];
    if (answer === undefined) continue;

    if (rq.phase === 1) {
      // Phase 1 역채점: 선택지의 targetType이 정방향 Phase 1의 dominant type과 일치하는지
      const chosen = (rq as ScenarioQuestion).choices.find(
        (c) => c.key === answer
      );
      if (!chosen) continue;
      const dominantType = getPhase1DominantType(answers, rq.id);
      checked++;
      if (chosen.targetType === dominantType) consistent++;
      continue;
    }

    if (rq.phase === 2) {
      // Phase 2 역채점: 같은 축 정방향 문항에서 cardA 선호 여부를 기준으로 일관성 판정
      const cq = rq as ChoiceQuestion;
      const sameAxisForward = questions.filter(
        (q): q is ChoiceQuestion =>
          q.phase === 2 && !q.isReverse && q.axis === cq.axis
      );
      if (sameAxisForward.length === 0) continue;

      // 정방향에서 카드A를 더 많이 골랐는가?
      const cardACount = sameAxisForward.filter(
        (q) => answers[q.id] === 'cardA'
      ).length;
      const preferCardA = cardACount > sameAxisForward.length / 2;

      // 역채점에서는 같은 축의 선호 방향과 반대로 골라야 일관됨
      const reverseAnswer = answer as 'cardA' | 'cardB';
      checked++;

      // 역채점 문항이므로 동일 방향성을 의미하는 카드가 정방향과 반대 위치.
      // 정방향에서 cardA(A축+3 또는 R축+3 또는 -3) 선호 → 역방향 cardB가 같은 방향성
      // 따라서 preferCardA && answer === 'cardB' OR !preferCardA && answer === 'cardA' 가 일관적
      if (
        (preferCardA && reverseAnswer === 'cardB') ||
        (!preferCardA && reverseAnswer === 'cardA')
      ) {
        consistent++;
      }
      continue;
    }
  }

  if (checked === 0) return 100;
  return Math.round((consistent / checked) * 100);
}

/** Phase 1의 정방향 문항(특정 ID 제외)에서 가장 많이 선택된 유형을 반환 */
function getPhase1DominantType(
  answers: AnswerRecord,
  excludeId: string
): SailType | null {
  const counts: Record<SailType, number> = { S: 0, A: 0, I: 0, L: 0 };

  for (const q of questions) {
    if (q.phase !== 1) continue;
    if (q.isReverse) continue;
    if (q.id === excludeId) continue;
    const a = answers[q.id];
    if (a === undefined) continue;
    const choice = q.choices.find((c) => c.key === a);
    if (choice) counts[choice.targetType]++;
  }

  let max = -1;
  let dominant: SailType | null = null;
  (['S', 'A', 'I', 'L'] as SailType[]).forEach((t) => {
    if (counts[t] > max) {
      max = counts[t];
      dominant = t;
    }
  });
  return dominant;
}

/** 일관성 라벨 — 결과 화면 표시용 */
export function consistencyLabel(score: number): {
  label: string | null;
  severity: 'ok' | 'warn' | 'retest';
} {
  if (score >= 75) return { label: null, severity: 'ok' };
  if (score >= 50)
    return {
      label: '응답에 약간의 모순이 있습니다',
      severity: 'warn',
    };
  return {
    label: '직관적으로 다시 응답해보시겠어요?',
    severity: 'retest',
  };
}
