/**
 * SAIL 소통 스타일 진단 — 30문항 데이터 (v3, 컨셉 v3 반영)
 *
 * 원본: SAIL_진단_문항설계서_30문항.md (작업 루트)
 * 본 파일은 원본과 1:1 동일해야 한다. 문항 텍스트·점수·유형 매핑을 임의로 변경하지 마라.
 * 채점 알고리즘이 이 데이터에 강하게 결합되어 있다.
 *
 * 두 축:
 *   - assertiveness (주도성, Ask↔Tell): +값 = Tell
 *   - responsiveness (감정표현성, Control↔Emote): +값 = Emote
 *
 * 역채점 문항: Q7, Q10, Q15, Q20 (isReverse: true)
 *
 * 맥락: 직장 12 / 조직·공동체 9 / 개인·일상 9 — 전 문항 조직·일상 맥락.
 *       (v2의 "코칭 맥락" 문항은 v3에서 모두 제거됨)
 */

import type {
  ChoiceQuestion,
  Question,
  ScenarioQuestion,
  SpectrumQuestion,
} from '@/types/sail';

// ============================================================
// Phase 1: 상황 판단 (Q1 ~ Q10) — 4지선다
// ============================================================
const phase1: ScenarioQuestion[] = [
  {
    id: 'Q1',
    phase: 1,
    category: 'workplace',
    situation:
      '팀에 새 프로젝트가 떨어졌다. 첫 회의에서 아직 역할도 방향도 정해지지 않았고, 다들 서로 눈치만 보고 있다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '목표와 일정을 먼저 제시하고, 역할 분담을 주도한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '"이거 재밌겠는데요!" 분위기를 띄우며 아이디어를 쏟아낸다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '비슷한 프로젝트 사례와 데이터를 찾아보자고 제안한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '각자 어떻게 생각하는지 한 명씩 의견을 물어본다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 2,
      },
    ],
  },
  {
    id: 'Q2',
    phase: 1,
    category: 'workplace',
    situation:
      '팀 프로젝트 마감이 3일 앞인데, 핵심 멤버가 개인 사정으로 이틀간 빠지겠다고 한다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '남은 인원으로 일정을 재배분하고, 내가 추가 분량을 가져간다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '팀원들을 모아 상황을 공유하고, 함께 해결책을 논의한다',
        targetType: 'A',
        assertiveness: 1,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '빠지는 멤버의 업무를 분석하고, 우선순위별 재배치안을 작성한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '일단 그 멤버의 사정을 들어보고, 부분 참여라도 가능한지 조율한다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 2,
      },
    ],
  },
  {
    id: 'Q3',
    phase: 1,
    category: 'community',
    situation: '정기 모임에서 다들 피곤한지 말이 없고 분위기가 축 처져 있다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '오늘 다룰 안건을 정리해서 바로 본론으로 들어간다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -2,
      },
      {
        key: 'b',
        text: '재미있는 이야기나 근황을 꺼내 분위기를 끌어올린다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '왜 분위기가 가라앉았는지 원인을 차분히 짚어본다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '"다들 많이 피곤하시죠?" 하며 상태를 먼저 살핀다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q4',
    phase: 1,
    category: 'workplace',
    situation:
      '회의 중 동료가 당신의 제안에 "그건 현실성이 떨어진다"고 공개적으로 반박한다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '바로 근거를 들어 재반론한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '유머를 섞어 분위기를 풀면서도 핵심은 지킨다',
        targetType: 'A',
        assertiveness: 1,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '왜 그렇게 생각하는지 구체적으로 되묻는다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '일단 수긍하고, 나중에 따로 다시 이야기한다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 2,
      },
    ],
  },
  {
    id: 'Q5',
    phase: 1,
    category: 'workplace',
    situation: '새로 들어온 후배가 같은 실수를 반복한다. 어떻게 대응하겠는가?',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '기대 수준과 현재 수준의 차이를 솔직하게 짚어준다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '어떤 점이 어려운지 물어보고, 잘하는 일로 역할을 바꿔준다',
        targetType: 'A',
        assertiveness: 1,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '명확한 체크리스트와 기준을 만들어 전달한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '옆에 앉아 같이 해보며 천천히 알려준다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q6',
    phase: 1,
    category: 'community',
    situation: '공동체에서 중요한 사안을 두고 의견이 둘로 팽팽히 갈렸다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '결정 기준을 제시하고, 표결로 빠르게 매듭짓자고 한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '양쪽의 좋은 점을 엮어 새로운 대안을 신나게 제안한다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '각 안의 장단점을 표로 정리해 비교하자고 한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '양쪽 모두의 마음이 상하지 않도록 중재를 시도한다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q7',
    phase: 1,
    category: 'workplace',
    situation:
      '함께 하기로 한 일을 동료가 바쁘다는 이유로 전혀 해놓지 않았다.',
    isReverse: true, // ★ 선택지 순서 I → L → S → A
    choices: [
      {
        key: 'a',
        text: '무엇이 일을 막았는지 원인을 분석하고 대안을 설계한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '힘들었을 마음을 먼저 다독이고, 페이스를 같이 조절한다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '다시 명확한 실행 계획과 점검 방법을 세운다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '무엇이 의욕을 떨어뜨렸는지 솔직히 이야기하며 동기를 살린다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q8',
    phase: 1,
    category: 'personal',
    situation: '주말에 예상치 못하게 온종일 혼자만의 시간이 생겼다. 가장 끌리는 활동은?',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '밀린 할 일을 정리하고 다음 주 계획을 세운다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '친구들에게 연락해 즉흥 모임을 만든다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '관심 있던 분야의 책이나 다큐멘터리를 깊이 파본다',
        targetType: 'I',
        assertiveness: -3,
        responsiveness: -2,
      },
      {
        key: 'd',
        text: '가까운 사람에게 안부를 묻고 긴 대화를 나눈다',
        targetType: 'L',
        assertiveness: -2,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q9',
    phase: 1,
    category: 'community',
    situation:
      '모임에서 두 사람이 한 사안을 두고 거칠게 논쟁하며 분위기가 싸늘해졌다. 당신은?',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '쟁점을 정리하고 합의안을 제시하며 상황을 정리한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '가벼운 농담으로 긴장을 풀고, 다름이 좋은 거라고 말한다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '양쪽 주장의 근거를 비교할 틀을 제시한다',
        targetType: 'I',
        assertiveness: -3,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '두 사람의 마음을 각각 들어주고 서로 이해하도록 돕는다',
        targetType: 'L',
        assertiveness: -2,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q10',
    phase: 1,
    category: 'personal',
    situation:
      '오랜 친구가 큰돈이 드는 도전을 신나게 이야기하는데, 당신이 보기엔 위험이 크다.',
    isReverse: true, // ★ 선택지 순서 A → S → L → I
    choices: [
      {
        key: 'a',
        text: '일단 응원하며, 내가 도울 수 있는 부분을 제안한다',
        targetType: 'A',
        assertiveness: 1,
        responsiveness: 3,
      },
      {
        key: 'b',
        text: '솔직하게 위험을 짚어주고 대안을 제시한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'c',
        text: '열정에 공감한 뒤, 걱정되는 점을 조심스럽게 꺼낸다',
        targetType: 'L',
        assertiveness: -2,
        responsiveness: 3,
      },
      {
        key: 'd',
        text: '같이 알아보자며 사실과 자료를 함께 확인한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
    ],
  },
];

// ============================================================
// Phase 2: 가치 선택 (Q11 ~ Q20) — 카드 2장 택1
// 선택 카드: 해당 축 ±3, 비선택: -1
// ============================================================
const phase2: ChoiceQuestion[] = [
  {
    id: 'Q11',
    phase: 2,
    category: 'workplace',
    axis: 'assertiveness',
    isReverse: false,
    cardA: {
      emoji: '🔥',
      title: '내가 방향을 정한다',
      description: '누군가 방향을 정해야 일이 움직인다. 내가 먼저 제시하는 편이 빠르다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🌊',
      title: '함께 방향을 찾는다',
      description: '방향은 함께 정할 때 더 단단하다. 먼저 의견을 모으는 편이다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q12',
    phase: 2,
    category: 'workplace',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '🎯',
      title: '문제 해결이 먼저',
      description: '감정은 나중에 정리하면 된다. 문제의 원인을 찾는 것이 우선이다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '💛',
      title: '관계 보전이 먼저',
      description: '관계가 깨지면 문제도 못 푼다. 마음을 먼저 확인하는 것이 순서다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q13',
    phase: 2,
    category: 'workplace',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '📊',
      title: '"일을 정확하게 해냈다"',
      description: '성과와 결과로 인정받는 것이 가장 뿌듯하다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '🌱',
      title: '"함께 일해서 즐거웠다"',
      description: '관계와 과정에서 인정받는 것이 가장 기쁘다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q14',
    phase: 2,
    category: 'workplace',
    axis: 'assertiveness',
    isReverse: false,
    cardA: {
      emoji: '⚡',
      title: '빠른 결정, 빠른 수정',
      description: '70%면 실행한다. 나머지는 가면서 고친다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🔍',
      title: '충분한 검토, 한 번의 결정',
      description: '한 번 잘 결정하면 고칠 일이 없다. 검토가 결국 더 빠르다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q15',
    phase: 2,
    category: 'personal',
    axis: 'responsiveness',
    isReverse: true, // ★ 역채점
    cardA: {
      emoji: '🧡',
      title: '감정을 나누며 푼다',
      description: '힘든 일은 감정을 솔직히 나눌 때 풀린다. 마음을 먼저 다룬다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🧠',
      title: '상황을 정리하며 푼다',
      description: '감정에 휘둘리면 길을 잃는다. 상황을 차분히 정리하는 것이 낫다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q16',
    phase: 2,
    category: 'community',
    axis: 'assertiveness',
    isReverse: false,
    cardA: {
      emoji: '🏗️',
      title: '틀을 짜고 역할을 나눈다',
      description: '구조가 있어야 모임이 굴러간다. 누군가 판을 깔아야 한다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🌱',
      title: '각자 알아서 맡게 둔다',
      description: '자율이 있어야 몰입한다. 스스로 맡을 때 책임감도 생긴다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q17',
    phase: 2,
    category: 'workplace',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '📋',
      title: '사실대로 직접 말한다',
      description: '잘한 점과 못한 점을 분명히 구분해 말한다. 모호하면 전달이 안 된다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '🤝',
      title: '상대를 봐가며 부드럽게 말한다',
      description:
        '상대의 상태를 보고 시점과 방식을 조절한다. 받을 준비가 됐을 때 말한다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q18',
    phase: 2,
    category: 'workplace',
    axis: 'assertiveness',
    isReverse: false,
    cardA: {
      emoji: '🗣️',
      title: '내 생각을 끝까지 관철한다',
      description: '확신이 있으면 밀고 나가야 한다. 쉽게 양보하면 좋은 생각도 묻힌다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🤲',
      title: '상대 의견에서 접점을 찾는다',
      description: '고집보다 유연함이 더 좋은 결과를 낸다. 접점을 찾는 것도 능력이다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q19',
    phase: 2,
    category: 'personal',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '🛠️',
      title: '해결책을 같이 찾는다',
      description:
        '공감도 좋지만 문제를 풀어야 마음이 편해진다. 방법을 같이 찾는다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '👂',
      title: '일단 끝까지 들어준다',
      description: '말하는 것만으로 반은 풀린다. 섣부른 해결책보다 경청이 힘이 된다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q20',
    phase: 2,
    category: 'workplace',
    axis: 'assertiveness',
    isReverse: true, // ★ 역채점
    cardA: {
      emoji: '🤝',
      title: '주변과 충분히 의논한 뒤 정한다',
      description: '혼자 정하면 놓치는 게 많다. 신뢰하는 사람들의 의견을 모은다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '🎯',
      title: '스스로 판단해 빠르게 정한다',
      description: '기회는 빠르게 잡아야 한다. 내 판단을 믿고 결단한다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
];

// ============================================================
// Phase 3: 성향 스펙트럼 (Q21 ~ Q30) — 슬라이더 0~100
// (값-50)*0.2 → ±10. leftDirection은 왼쪽(0)이 해당 축의 high인지 low인지.
// Phase 3는 역채점 없음 (isReverse: false 고정)
// ============================================================
const phase3: SpectrumQuestion[] = [
  {
    id: 'Q21',
    phase: 3,
    category: 'workplace',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '목표를 향해 이끄는 것이 나답다',
    rightLabel: '함께 발맞춰 가는 것이 나답다',
    leftEmoji: '🎯',
    rightEmoji: '🌿',
    leftDirection: 'high', // 왼쪽 = Tell (높은 주도성)
  },
  {
    id: 'Q22',
    phase: 3,
    category: 'workplace',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '논리와 근거로 설득한다',
    rightLabel: '공감과 이야기로 설득한다',
    leftEmoji: '📊',
    rightEmoji: '📖',
    leftDirection: 'low', // 왼쪽 = Control (낮은 감정표현성)
  },
  {
    id: 'Q23',
    phase: 3,
    category: 'workplace',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '내가 먼저 판을 짜서 끌고 간다',
    rightLabel: '상황을 보며 흐름에 맞춰 간다',
    leftEmoji: '⚡',
    rightEmoji: '🌊',
    leftDirection: 'high',
  },
  {
    id: 'Q24',
    phase: 3,
    category: 'workplace',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '일과 사적 관계는 분리한다',
    rightLabel: '좋은 관계가 좋은 일의 바탕이다',
    leftEmoji: '🏢',
    rightEmoji: '🤝',
    leftDirection: 'low',
  },
  {
    id: 'Q25',
    phase: 3,
    category: 'personal',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '변화를 내가 주도하는 편이다',
    rightLabel: '변화에 적응하는 편이다',
    leftEmoji: '🚀',
    rightEmoji: '🏔️',
    leftDirection: 'high',
  },
  {
    id: 'Q26',
    phase: 3,
    category: 'personal',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '감정은 차분히 다스리는 편이다',
    rightLabel: '감정은 그대로 드러나는 편이다',
    leftEmoji: '🧠',
    rightEmoji: '💛',
    leftDirection: 'low',
  },
  {
    id: 'Q27',
    phase: 3,
    category: 'personal',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '성과와 결과로 인정받고 싶다',
    rightLabel: '진심 어린 감사의 말을 듣고 싶다',
    leftEmoji: '🏆',
    rightEmoji: '💌',
    leftDirection: 'low',
  },
  {
    id: 'Q28',
    phase: 3,
    category: 'personal',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '일단 해보고 부딪치며 익힌다',
    rightLabel: '충분히 알아본 뒤에 시작한다',
    leftEmoji: '⚡',
    rightEmoji: '🔬',
    leftDirection: 'high',
  },
  {
    id: 'Q29',
    phase: 3,
    category: 'personal',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '경쟁이 나를 성장시킨다',
    rightLabel: '협력이 나를 성장시킨다',
    leftEmoji: '🔥',
    rightEmoji: '🌳',
    leftDirection: 'high',
  },
  {
    id: 'Q30',
    phase: 3,
    category: 'personal',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '혼자만의 사색과 휴식으로 채운다',
    rightLabel: '사람들과의 대화와 교류로 채운다',
    leftEmoji: '🌙',
    rightEmoji: '☀️',
    leftDirection: 'low',
  },
];

// ============================================================
// Exports
// ============================================================
export const phase1Questions: readonly ScenarioQuestion[] = phase1;
export const phase2Questions: readonly ChoiceQuestion[] = phase2;
export const phase3Questions: readonly SpectrumQuestion[] = phase3;

export const questions: readonly Question[] = [...phase1, ...phase2, ...phase3];

/** 빠른 조회용 맵 */
export const questionMap: Readonly<Record<string, Question>> = Object.freeze(
  questions.reduce(
    (acc, q) => {
      acc[q.id] = q;
      return acc;
    },
    {} as Record<string, Question>
  )
);
