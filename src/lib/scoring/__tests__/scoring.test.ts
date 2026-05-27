/**
 * 채점 알고리즘 단위 테스트 (의존성 없는 순수 노드 실행)
 *
 * 실행: `npx tsx src/lib/scoring/__tests__/scoring.test.ts`
 *
 * 외부 테스트 러너(Vitest/Jest)를 도입하지 않은 이유:
 *   - 현재 채점 외에 단위 테스트가 필요한 영역이 없음
 *   - Phase 2에서 더 많은 테스트가 필요해지면 Vitest로 전환 검토 (next.md)
 *
 * 검증 시나리오:
 *   1. 빈 응답 → 모든 점수 0, 4유형 25% 균등
 *   2. 전 문항 S 응답 → dominant S
 *   3. 전 문항 A 응답 → dominant A
 *   4. 전 문항 I 응답 → dominant I
 *   5. 전 문항 L 응답 → dominant L
 *   6. 일관성 검증: 정방향과 일치하는 역채점 응답 → 100%
 *   7. 일관성 검증: 모든 역채점이 반대 → 낮은 점수
 */

import { questions } from '@/data/questions';
import type {
  AnswerRecord,
  ChoiceQuestion,
  SailType,
  ScenarioQuestion,
} from '@/types/sail';

import { calculateRawScores, normalize } from '../calculator';
import { calculateConsistency } from '../consistency';
import { diagnose } from '../gaussian';

// ============================================================
// 테스트 헬퍼
// ============================================================

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function section(name: string) {
  console.log(`\n[${name}]`);
}

/**
 * 모든 문항에서 특정 유형으로 응답하는 시나리오 생성
 * Phase 1: 해당 유형의 선택지 선택
 * Phase 2: 해당 축이 type center 방향이 되도록 카드 선택
 * Phase 3: 해당 축이 type center 방향이 되도록 슬라이더 위치
 */
function generateAnswersForType(type: SailType): AnswerRecord {
  const answers: AnswerRecord = {};

  // 유형별 중심점 (assertiveness, responsiveness)
  const wantsHighA = type === 'S' || type === 'A';
  const wantsHighR = type === 'A' || type === 'L';

  for (const q of questions) {
    if (q.phase === 1) {
      const sq = q as ScenarioQuestion;
      const choice = sq.choices.find((c) => c.targetType === type);
      if (choice) answers[q.id] = choice.key;
      continue;
    }

    if (q.phase === 2) {
      const cq = q as ChoiceQuestion;
      // 원하는 축 방향 (양수 또는 음수)
      const wantPositive =
        cq.axis === 'assertiveness' ? wantsHighA : wantsHighR;
      // cardA의 점수가 양수이면 → wantPositive일 때 cardA, 아니면 cardB
      const cardAIsPositive = cq.cardA.scoreIfSelected > 0;
      answers[q.id] = wantPositive === cardAIsPositive ? 'cardA' : 'cardB';
      continue;
    }

    if (q.phase === 3) {
      const wantPositive =
        q.axis === 'assertiveness' ? wantsHighA : wantsHighR;
      // leftDirection 'high' && wantPositive → 왼쪽(0)
      // leftDirection 'high' && !wantPositive → 오른쪽(100)
      // leftDirection 'low'  && wantPositive → 오른쪽(100)
      // leftDirection 'low'  && !wantPositive → 왼쪽(0)
      const leftIsHigh = q.leftDirection === 'high';
      const goLeft = leftIsHigh === wantPositive;
      answers[q.id] = goLeft ? 0 : 100;
      continue;
    }
  }

  return answers;
}

// ============================================================
// 1. 빈 응답
// ============================================================
section('1. Empty answers');
{
  const empty: AnswerRecord = {};
  const raw = calculateRawScores(empty);
  assert(
    raw.assertivenessRaw === 0 && raw.responsivenessRaw === 0,
    `raw scores are zero (got a=${raw.assertivenessRaw}, r=${raw.responsivenessRaw})`
  );
  const probs = diagnose(normalize(raw), 100).probabilities;
  assert(
    probs.S === 25 && probs.A === 25 && probs.I === 25 && probs.L === 25,
    `empty answers → equal 25% (got S=${probs.S}, A=${probs.A}, I=${probs.I}, L=${probs.L})`
  );
}

// ============================================================
// 2~5. 각 유형 100% 응답 → 해당 유형이 dominant
// ============================================================
const allTypes: SailType[] = ['S', 'A', 'I', 'L'];
for (const t of allTypes) {
  section(`Type ${t}: all-${t} answers`);
  const answers = generateAnswersForType(t);
  assert(
    Object.keys(answers).length === 30,
    `30 answers generated (got ${Object.keys(answers).length})`
  );
  const raw = calculateRawScores(answers);
  const norm = normalize(raw);
  const result = diagnose(norm, 100);
  assert(
    result.dominantType === t,
    `dominantType = ${t} (got ${result.dominantType})`
  );
  assert(
    result.probabilities[t] > 40,
    `${t} probability > 40% (got ${result.probabilities[t]}%)`
  );
  console.log(
    `    → raw a=${raw.assertivenessRaw.toFixed(1)}, r=${raw.responsivenessRaw.toFixed(1)} | norm i=${norm.i.toFixed(3)}, s=${norm.s.toFixed(3)} | label="${result.label}"`
  );
}

// ============================================================
// 6. 강도 (intensity) — 원점 응답은 강도 < 0.3
// ============================================================
section('6. Intensity for center-positioned answers');
{
  const center: AnswerRecord = {};
  // 모든 슬라이더를 50, Phase 2는 임의로 절반씩
  for (const q of questions) {
    if (q.phase === 3) center[q.id] = 50;
  }
  const raw = calculateRawScores(center);
  const norm = normalize(raw);
  const result = diagnose(norm, 100);
  assert(
    result.intensity < 0.3,
    `low intensity for center slider (got ${result.intensity.toFixed(3)})`
  );
  assert(
    result.label.includes('아직 뚜렷한 스타일'),
    `label hints non-formed style (got "${result.label}")`
  );
}

// ============================================================
// 7. 일관성 — 한 유형으로 일관 응답 시 100%
// ============================================================
section('7. Consistency: all-S answers');
{
  const answers = generateAnswersForType('S');
  const score = calculateConsistency(answers);
  assert(score === 100, `S-consistent answers → 100% (got ${score})`);
}

section('7b. Consistency: mixed inconsistent reverses');
{
  // Phase 1 정방향에서 S를 많이 뽑되, 역채점 Q7/Q10에서는 L을 고름
  const answers: AnswerRecord = {};
  for (const q of questions) {
    if (q.phase === 1) {
      const sq = q as ScenarioQuestion;
      if (q.id === 'Q7' || q.id === 'Q10') {
        // 역채점에서 L 유형 선택지를 고름 → 정방향 dominant인 S와 불일치
        const lChoice = sq.choices.find((c) => c.targetType === 'L');
        answers[q.id] = lChoice?.key ?? sq.choices[0].key;
      } else {
        // S 선택지를 고름
        const sChoice = sq.choices.find((c) => c.targetType === 'S');
        answers[q.id] = sChoice?.key ?? sq.choices[0].key;
      }
      continue;
    }
    // Phase 2: A축 정방향(Q14, Q16, Q18)은 cardA(양수), 역채점 Q20에서도 cardA(음수)
    if (q.phase === 2) {
      const cq = q as ChoiceQuestion;
      if (cq.axis === 'assertiveness') {
        if (cq.isReverse) {
          // Q20 cardA: -3 → 정방향에서 +3 선호와 불일치
          answers[q.id] = 'cardA';
        } else {
          // Q14, Q16, Q18 cardA: +3 → 정방향 선호
          answers[q.id] = 'cardA';
        }
      } else {
        // R축: 정방향 Q12,13,17,19 cardA가 모두 -3
        if (cq.isReverse) {
          // Q15 cardA: +3 → 정방향(cardA -3) 선호와 같은 방향성을 위해 cardB 선택해야 일관
          // 일부러 불일치시켜 cardA
          answers[q.id] = 'cardA';
        } else {
          answers[q.id] = 'cardA';
        }
      }
      continue;
    }
    if (q.phase === 3) answers[q.id] = 50;
  }
  const score = calculateConsistency(answers);
  assert(score < 100, `intentional inconsistency → score < 100 (got ${score})`);
}

// ============================================================
// Summary
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log('All tests passed ✓');
process.exit(0);
