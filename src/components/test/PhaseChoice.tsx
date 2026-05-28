'use client';

/**
 * PhaseChoice — Phase 2 (강제 선택: 카드 2장 중 하나)
 *
 * - 좌우 배치 (모바일에서는 상하)
 * - 선택 시 선택 카드 강조 + 비선택 페이드, 잠시 후 다음 문항
 */

import { AnimatePresence, motion } from 'framer-motion';

import { phase2Questions } from '@/data/questions';
import { useTestStore } from '@/stores/test-store';
import type { ChoiceCard, ChoiceQuestion } from '@/types/sail';

const slideVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function PhaseChoice() {
  const questionIndex = useTestStore((s) => s.questionIndex);
  const answers = useTestStore((s) => s.answers);
  const answerQuestion = useTestStore((s) => s.answerQuestion);
  const nextQuestion = useTestStore((s) => s.nextQuestion);
  const completePhase = useTestStore((s) => s.completePhase);

  const q: ChoiceQuestion = phase2Questions[questionIndex];
  const currentAnswer = answers[q.id] as 'cardA' | 'cardB' | undefined;

  const handleSelect = (which: 'cardA' | 'cardB') => {
    answerQuestion(q.id, which);
    setTimeout(() => {
      if (questionIndex >= phase2Questions.length - 1) {
        completePhase();
      } else {
        nextQuestion();
      }
    }, 350);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={q.id}
        variants={slideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl"
      >
        <div className="rounded-question border border-sail-gray-200 bg-white p-6 shadow-card md:p-8">
          {/* 메타 */}
          <p className="mb-2 text-caption font-medium uppercase tracking-wide text-sail-orange">
            {q.id} · 가치 선택
          </p>

          <h2 className="mb-8 text-body-lg leading-relaxed font-medium text-sail-gray-900 md:text-h4">
            두 카드 중 더 가까운 쪽을 선택하세요
          </h2>

          {/* 카드 2장 */}
          <div className="grid gap-4 md:grid-cols-2">
            <ChoiceCardButton
              card={q.cardA}
              selected={currentAnswer === 'cardA'}
              dimmed={currentAnswer === 'cardB'}
              onClick={() => handleSelect('cardA')}
            />
            <ChoiceCardButton
              card={q.cardB}
              selected={currentAnswer === 'cardB'}
              dimmed={currentAnswer === 'cardA'}
              onClick={() => handleSelect('cardB')}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ChoiceCardButton({
  card,
  selected,
  dimmed,
  onClick,
}: {
  card: ChoiceCard;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex flex-col items-start gap-3 rounded-card border-2 p-6 text-left transition-all',
        selected
          ? 'border-sail-navy bg-sail-navy-bg shadow-card-hover scale-[1.02]'
          : dimmed
            ? 'border-sail-gray-200 bg-white opacity-40'
            : 'border-sail-gray-200 bg-white hover:border-sail-navy hover:shadow-card-hover',
      ].join(' ')}
    >
      <span className="text-4xl">{card.emoji}</span>
      <span className="text-h4 font-bold text-sail-gray-900">{card.title}</span>
      <span className="text-bodySm leading-relaxed text-sail-gray-600">
        {card.description}
      </span>
    </button>
  );
}
