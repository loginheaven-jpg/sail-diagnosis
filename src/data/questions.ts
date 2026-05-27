/**
 * SAIL 진단 30문항 데이터
 *
 * 원본: SAIL_진단_문항설계서_30문항 (1).md (작업 루트)
 * 본 파일은 원본과 1:1 동일해야 한다. 문항 텍스트·점수·유형 매핑을 임의로 변경하지 마라.
 * 채점 알고리즘이 이 데이터에 강하게 결합되어 있다.
 *
 * 역채점 문항: Q7, Q10, Q15, Q20 (isReverse: true)
 */

import type {
  ChoiceQuestion,
  Question,
  ScenarioQuestion,
  SpectrumQuestion,
} from '@/types/sail';

// ============================================================
// Phase 1: 시나리오 (Q1 ~ Q10)
// 4지선다 — 각 선택지가 S/A/I/L 유형 반응을 대변
// ============================================================
const phase1: ScenarioQuestion[] = [
  {
    id: 'Q1',
    phase: 1,
    category: 'coaching',
    situation:
      '새로운 피코치와의 첫 오리엔테이션 세션이다. 피코치는 다소 긴장한 듯 보이고, 코칭을 통해 무엇을 얻을 수 있을지 불확실해한다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '코칭 프로세스의 목표·로드맵·기대 성과를 먼저 제시하며 세션을 주도한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '코칭 여정이 얼마나 흥미로운 모험이 될지, 열정을 담아 스토리를 들려준다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '코칭 합의서와 진행 원칙을 확인하고, 사전 질문지를 바탕으로 데이터를 점검한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '피코치의 긴장과 기대감에 공감하며, 편안하게 이야기할 수 있는 분위기를 만든다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q2',
    phase: 1,
    category: 'general',
    situation:
      '팀 프로젝트 마감이 3일 앞인데, 핵심 멤버 한 명이 개인 사정으로 이틀간 빠지겠다고 한다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '남은 인원으로 일정을 재배분하고, 본인이 추가 분량을 가져간다',
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
    category: 'coaching',
    situation:
      '코칭 세션 중 피코치가 1분 이상 깊은 침묵에 빠졌다. "어떻게 해야 할지 잘 모르겠어요..." 하며 곤란한 표정을 짓는다.',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '즉시 실행 가능한 행동 과제나 강력한 질문을 던져 돌파구를 만든다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -2,
      },
      {
        key: 'b',
        text: '침묵도 성장의 과정임을 상기시키며, 내가 겪은 비슷한 정체기를 나눈다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '막힌 지점이 인지적 오류인지, 자원 부족인지 구조화하여 분석한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '아무 판단 없이 그 침묵을 함께 견디며, 스스로 정리할 때까지 기다린다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q4',
    phase: 1,
    category: 'general',
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
        text: '분위기가 경직되지 않도록 유머를 섞어 가볍게 넘기면서 핵심은 유지한다',
        targetType: 'A',
        assertiveness: 1,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '왜 현실성이 떨어진다고 생각하는지 구체적으로 질문한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '일단 수긍하는 모습을 보이고, 나중에 1:1로 다시 논의한다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 2,
      },
    ],
  },
  {
    id: 'Q5',
    phase: 1,
    category: 'coaching',
    situation:
      '피코치의 360도 다면평가 결과에 뼈아픈 부정적 피드백이 포함되어 있다. 이 민감한 데이터를 어떻게 전달할 것인가?',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '핵심 요점을 명확히 짚고, 당장 개선할 행동 목표를 수립하도록 독려한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '피드백에 담긴 가능성을 긍정적으로 리프레이밍하며 미래 성장상을 그린다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '통계적 분포와 서술형 문장을 객관적으로 비교 분석하며 이성적 이해를 돕는다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '부정적 평가를 본 당혹감과 상처를 먼저 헤아리고 위로한 뒤 대화를 연다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q6',
    phase: 1,
    category: 'general',
    situation: '새로 합류한 팀원이 첫 주에 같은 실수를 반복한다. 당신의 대응은?',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '기대 수준과 현재 수준의 갭을 솔직하게 짚어준다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '어떤 부분이 어려운지 물어보고, 강점을 살릴 수 있는 역할로 조정한다',
        targetType: 'A',
        assertiveness: 1,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '명확한 기준과 체크리스트를 만들어 전달한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '직접 옆에 앉아서 같이 해보며 알려준다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q7',
    phase: 1,
    category: 'coaching',
    situation:
      '피코치가 스스로 다짐한 실행 과제를 바쁘다는 이유로 전혀 이행하지 않은 채 세션에 왔다.',
    isReverse: true, // ★ 선택지 순서 I → L → S → A
    choices: [
      {
        key: 'a',
        text: '실행을 방해한 요인을 리스트업하여 인과관계를 분석하고 대안을 설계한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '수행하지 못한 마음의 짐을 먼저 다독이고, 에너지 수준에 맞춰 속도를 조율한다',
        targetType: 'L',
        assertiveness: -3,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '강력한 실행 방안과 이행 점검 시스템을 재구축한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '실행을 가로막은 심리적 저항을 은유로 표현해보게 하고 동기를 재점화한다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q8',
    phase: 1,
    category: 'general',
    situation: '주말에 예상치 않게 온종일 혼자만의 시간이 생겼다. 가장 끌리는 활동은?',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '밀린 할 일 목록을 정리하고, 다음 주 전략을 세운다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '친구들에게 연락해서 즉흥 모임을 만든다',
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
        text: '가까운 사람에게 연락해서 안부를 묻고 긴 대화를 나눈다',
        targetType: 'L',
        assertiveness: -2,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q9',
    phase: 1,
    category: 'coaching',
    situation:
      '기업 워크숍에서 두 참석자가 핵심 문제를 두고 거칠게 논쟁을 벌이며 분위기가 냉각되었다. 퍼실리테이터로서 당신의 대처는?',
    isReverse: false,
    choices: [
      {
        key: 'a',
        text: '쟁점을 정리해 칠판에 적고, 합의안을 제시하며 진행을 주도한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'b',
        text: '긴장을 완화하는 유머나 액티비티를 도입하고, 다름이 혁신으로 이어질 수 있음을 설명한다',
        targetType: 'A',
        assertiveness: 2,
        responsiveness: 3,
      },
      {
        key: 'c',
        text: '양측 주장의 근거와 전제를 비교할 수 있는 분석 프레임을 제시한다',
        targetType: 'I',
        assertiveness: -3,
        responsiveness: -3,
      },
      {
        key: 'd',
        text: '두 사람의 긍정적 의도와 감정을 각각 경청·요약하고, 상호 이해를 중재한다',
        targetType: 'L',
        assertiveness: -2,
        responsiveness: 3,
      },
    ],
  },
  {
    id: 'Q10',
    phase: 1,
    category: 'general',
    situation: '오랜 친구가 창업 아이디어를 신나게 설명하는데, 당신이 보기에 리스크가 크다.',
    isReverse: true, // ★ 선택지 순서 A → S → L → I
    choices: [
      {
        key: 'a',
        text: '일단 응원하며, 내가 도울 수 있는 부분(홍보·네트워킹 등)을 제안한다',
        targetType: 'A',
        assertiveness: 1,
        responsiveness: 3,
      },
      {
        key: 'b',
        text: '솔직하게 리스크를 짚어주고, 대안을 제안한다',
        targetType: 'S',
        assertiveness: 3,
        responsiveness: -3,
      },
      {
        key: 'c',
        text: '열정에 공감을 표한 뒤, 걱정되는 점을 조심스럽게 꺼낸다',
        targetType: 'L',
        assertiveness: -2,
        responsiveness: 3,
      },
      {
        key: 'd',
        text: '시장 조사를 같이 해보자고 제안하고, 팩트를 함께 확인한다',
        targetType: 'I',
        assertiveness: -2,
        responsiveness: -3,
      },
    ],
  },
];

// ============================================================
// Phase 2: 강제 선택 (Q11 ~ Q20)
// 카드 2장 택1, 선택 ±3 / 비선택 -1
// ============================================================
const phase2: ChoiceQuestion[] = [
  {
    id: 'Q11',
    phase: 2,
    category: 'coaching',
    axis: 'assertiveness',
    isReverse: false,
    cardA: {
      emoji: '🔥',
      title: '방향 제시자',
      description:
        '피코치에게 필요한 것은 명확한 방향이다. 때로는 코치가 강하게 제안하고 이끌어야 진짜 변화가 일어난다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🌊',
      title: '흐름 동행자',
      description:
        '진짜 변화는 피코치 스스로 깨달을 때 온다. 코치는 함께 걸으며 질문을 던지는 사람이면 충분하다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q12',
    phase: 2,
    category: 'general',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '🎯',
      title: '문제 해결이 먼저',
      description: '감정은 나중에 정리하면 된다. 문제의 원인을 찾아 해결하는 것이 모두에게 이롭다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '💛',
      title: '관계 보전이 먼저',
      description: '관계가 깨지면 문제도 못 푼다. 서로의 마음을 먼저 확인하는 것이 순서다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q13',
    phase: 2,
    category: 'coaching',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '📊',
      title: '측정 가능한 행동 변화',
      description: '코칭의 가치는 피코치의 구체적 행동 변화와 성과 지표로 입증되어야 한다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '🌱',
      title: '내면의 성장과 자기 인식',
      description: '겉으로 보이지 않더라도, 피코치의 자기 이해가 깊어졌다면 그것이 진짜 성과다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q14',
    phase: 2,
    category: 'general',
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
      description: '한 번 잘 결정하면 고칠 일이 없다. 충분히 검토하는 것이 결국 더 빠르다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q15',
    phase: 2,
    category: 'coaching',
    axis: 'responsiveness',
    isReverse: true, // ★ 역채점
    cardA: {
      emoji: '🧡',
      title: '감정을 적극 활용하는 세션',
      description:
        '피코치의 감정 흐름이 가장 강력한 변화의 단서다. 감정을 깊이 다루는 것이 세션의 핵심이다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🧠',
      title: '인지적 구조화 중심 세션',
      description:
        '감정에 휘둘리면 방향을 잃는다. 상황을 구조화하고 논리적으로 정리하는 것이 더 도움이 된다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q16',
    phase: 2,
    category: 'general',
    axis: 'assertiveness',
    isReverse: false,
    cardA: {
      emoji: '🏗️',
      title: '로드맵을 짜고 역할을 배분한다',
      description: '방향과 구조가 있어야 팀이 움직인다. 리더가 판을 깔아야 실행이 빨라진다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🌱',
      title: '각자 자율적으로 역할을 잡게 한다',
      description: '자율성이 있어야 몰입한다. 스스로 역할을 잡을 때 책임감도 따라온다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q17',
    phase: 2,
    category: 'coaching',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '📋',
      title: '사실 기반 직접 전달',
      description: '잘한 점과 못한 점을 명확히 구분해서 전달한다. 모호하면 성장도 모호해진다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '🤝',
      title: '관계 고려 간접 전달',
      description:
        '상대의 감정 상태를 보고, 시점과 방식을 조절한다. 수용할 준비가 되었을 때 전달해야 효과가 있다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q18',
    phase: 2,
    category: 'general',
    axis: 'assertiveness',
    isReverse: false,
    cardA: {
      emoji: '🗣️',
      title: '끝까지 내 논리를 관철한다',
      description: '확신이 있으면 밀고 나가야 한다. 쉽게 양보하면 좋은 아이디어도 묻힌다.',
      scoreIfSelected: 3,
    },
    cardB: {
      emoji: '🤲',
      title: '상대 의견에서 접점을 찾는다',
      description: '고집보다 유연함이 더 좋은 결과를 만든다. 접점을 찾는 것도 능력이다.',
      scoreIfSelected: -3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q19',
    phase: 2,
    category: 'general',
    axis: 'responsiveness',
    isReverse: false,
    cardA: {
      emoji: '🛠️',
      title: '해결책을 같이 찾아준다',
      description:
        '공감도 좋지만, 문제를 해결해야 마음이 편해진다. 구체적 방안을 함께 찾는 것이 진짜 도움이다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '👂',
      title: '일단 끝까지 들어준다',
      description: '말하는 것만으로도 반은 해결된다. 섣부른 해결책보다 온전한 경청이 더 큰 힘이다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
  {
    id: 'Q20',
    phase: 2,
    category: 'coaching',
    axis: 'assertiveness',
    isReverse: true, // ★ 역채점
    cardA: {
      emoji: '🤝',
      title: '동료들과 충분히 의논한 뒤 결정',
      description:
        '혼자 결정하면 놓치는 것이 많다. 신뢰하는 사람들의 관점을 모아야 좋은 판단이 된다.',
      scoreIfSelected: -3,
    },
    cardB: {
      emoji: '🎯',
      title: '스스로 판단하고 빠르게 실행',
      description: '기회는 빠르게 잡아야 한다. 내 전문성을 믿고 결단하는 것이 경쟁력이다.',
      scoreIfSelected: 3,
    },
    scoreIfNotSelected: -1,
  },
];

// ============================================================
// Phase 3: 스펙트럼 (Q21 ~ Q30)
// 슬라이더 0~100, (값-50)*0.2 → ±10
// Phase 3는 역채점 없음 (isReverse: false 고정)
// ============================================================
const phase3: SpectrumQuestion[] = [
  {
    id: 'Q21',
    phase: 3,
    category: 'coaching',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '코치는 목표 달성을 이끄는 전략 파트너다',
    rightLabel: '코치는 자기 발견을 돕는 동반자다',
    leftEmoji: '🎯',
    rightEmoji: '🌿',
    leftDirection: 'high',
  },
  {
    id: 'Q22',
    phase: 3,
    category: 'general',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '논리와 근거로 설득한다',
    rightLabel: '공감과 스토리로 설득한다',
    leftEmoji: '📊',
    rightEmoji: '📖',
    leftDirection: 'low',
  },
  {
    id: 'Q23',
    phase: 3,
    category: 'coaching',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '세션 아젠다를 코치가 주도적으로 설계한다',
    rightLabel: '피코치가 그날의 주제를 자유롭게 가져오게 한다',
    leftEmoji: '⚡',
    rightEmoji: '🌊',
    leftDirection: 'high',
  },
  {
    id: 'Q24',
    phase: 3,
    category: 'general',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '업무와 사적 관계를 분리한다',
    rightLabel: '좋은 관계가 좋은 업무의 기반이다',
    leftEmoji: '🏢',
    rightEmoji: '🤝',
    leftDirection: 'low',
  },
  {
    id: 'Q25',
    phase: 3,
    category: 'general',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '변화를 주도하는 편이다',
    rightLabel: '변화에 적응하는 편이다',
    leftEmoji: '🚀',
    rightEmoji: '🏔️',
    leftDirection: 'high',
  },
  {
    id: 'Q26',
    phase: 3,
    category: 'coaching',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '감정을 객관적으로 분석하여 패턴을 찾아준다',
    rightLabel: '감정을 있는 그대로 충분히 느끼도록 공간을 준다',
    leftEmoji: '🧠',
    rightEmoji: '💛',
    leftDirection: 'low',
  },
  {
    id: 'Q27',
    phase: 3,
    category: 'general',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '객관적 지표(수치·등급·보상)로 인정받고 싶다',
    rightLabel: '진심 어린 감사와 인정의 말을 듣고 싶다',
    leftEmoji: '🏆',
    rightEmoji: '💌',
    leftDirection: 'low',
  },
  {
    id: 'Q28',
    phase: 3,
    category: 'coaching',
    axis: 'assertiveness',
    isReverse: false,
    leftLabel: '새 도구를 실제 세션에 즉시 적용하고 성과로 검증한다',
    rightLabel: '이론적 배경과 타당도 논문을 먼저 철저히 분석한다',
    leftEmoji: '⚡',
    rightEmoji: '🔬',
    leftDirection: 'high',
  },
  {
    id: 'Q29',
    phase: 3,
    category: 'general',
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
    category: 'coaching',
    axis: 'responsiveness',
    isReverse: false,
    leftLabel: '혼자만의 깊은 사색과 휴식',
    rightLabel: '동료나 지인들과의 대화·교류',
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
