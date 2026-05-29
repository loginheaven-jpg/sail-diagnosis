'use client';

/**
 * PhaseChoice — Phase 2 (강제 선택: 카드 2장 중 하나) v2.0 다크
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

const CARD_BG =
  'linear-gradient(180deg, rgba(15,36,56,0.7), rgba(10,22,40,0.7))';

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
        <div
          className="rounded-modal border p-7 md:p-9"
          style={{
            background: CARD_BG,
            borderColor: 'rgba(201,162,39,0.15)',
          }}
        >
          <p
            className="mb-3 font-serif text-sail-gold"
            style={{
              fontSize: 11,
              letterSpacing: '0.3em',
              fontWeight: 600,
            }}
          >
            {q.id.toUpperCase()} · 가치 선택
          </p>

          <h2
            className="mb-9 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(18px, 2vw, 22px)',
              fontWeight: 500,
              lineHeight: 1.55,
              letterSpacing: '-0.005em',
            }}
          >
            두 카드 중 더 가까운 쪽을 선택하세요
          </h2>

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
      className="group flex flex-col items-start gap-3 rounded-card border p-7 text-left transition-all duration-300"
      style={{
        background: selected
          ? 'rgba(201,162,39,0.10)'
          : 'rgba(15,36,56,0.5)',
        borderColor: selected
          ? 'rgba(224,201,119,0.6)'
          : 'rgba(169,187,208,0.14)',
        opacity: dimmed ? 0.45 : 1,
        transform: selected ? 'scale(1.015)' : 'scale(1)',
        boxShadow: selected
          ? '0 16px 50px -16px rgba(201,162,39,0.35)'
          : 'none',
      }}
      onMouseEnter={(e) => {
        if (!selected && !dimmed) {
          e.currentTarget.style.borderColor = 'rgba(224,201,119,0.35)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected && !dimmed) {
          e.currentTarget.style.borderColor = 'rgba(169,187,208,0.14)';
        }
      }}
    >
      <span className="text-4xl">{card.emoji}</span>
      <span
        className="font-serif text-sail-paper"
        style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}
      >
        {card.title}
      </span>
      <span className="text-sail-mist" style={{ fontSize: 14, lineHeight: 1.7 }}>
        {card.description}
      </span>
    </button>
  );
}
