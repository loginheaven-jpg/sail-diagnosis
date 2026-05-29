'use client';

/**
 * PhaseScenario — Phase 1 (4지선다 시나리오) v2.0 다크
 */

import { AnimatePresence, motion } from 'framer-motion';

import { phase1Questions } from '@/data/questions';
import { useTestStore } from '@/stores/test-store';
import type { ScenarioChoice, ScenarioQuestion } from '@/types/sail';

const slideVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

const CARD_BG =
  'linear-gradient(180deg, rgba(15,36,56,0.7), rgba(10,22,40,0.7))';

export function PhaseScenario() {
  const questionIndex = useTestStore((s) => s.questionIndex);
  const answers = useTestStore((s) => s.answers);
  const answerQuestion = useTestStore((s) => s.answerQuestion);
  const nextQuestion = useTestStore((s) => s.nextQuestion);
  const completePhase = useTestStore((s) => s.completePhase);

  const q: ScenarioQuestion = phase1Questions[questionIndex];
  const currentAnswer = answers[q.id] as 'a' | 'b' | 'c' | 'd' | undefined;

  const handleSelect = (choice: ScenarioChoice) => {
    answerQuestion(q.id, choice.key);
    setTimeout(() => {
      if (questionIndex >= phase1Questions.length - 1) {
        completePhase();
      } else {
        nextQuestion();
      }
    }, 320);
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
        className="w-full max-w-2xl"
      >
        <div
          className="rounded-modal border p-7 md:p-9"
          style={{
            background: CARD_BG,
            borderColor: 'rgba(201,162,39,0.15)',
          }}
        >
          {/* 메타 */}
          <p
            className="mb-3 font-serif text-sail-gold"
            style={{
              fontSize: 11,
              letterSpacing: '0.3em',
              fontWeight: 600,
            }}
          >
            {q.id.toUpperCase()} · 상황 판단
          </p>

          {/* 상황 */}
          <h2
            className="mb-7 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(18px, 2vw, 22px)',
              fontWeight: 500,
              lineHeight: 1.55,
              letterSpacing: '-0.005em',
            }}
          >
            {q.situation}
          </h2>

          {/* 선택지 */}
          <div className="space-y-3" role="radiogroup" aria-label="응답 선택지">
            {q.choices.map((choice) => {
              const selected = currentAnswer === choice.key;
              return (
                <button
                  key={choice.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleSelect(choice)}
                  className="flex w-full items-start gap-3 rounded-card border px-5 py-4 text-left transition-all"
                  style={{
                    background: selected
                      ? 'rgba(201,162,39,0.08)'
                      : 'rgba(15,36,56,0.4)',
                    borderColor: selected
                      ? 'rgba(224,201,119,0.55)'
                      : 'rgba(169,187,208,0.12)',
                    color: 'var(--color-sail-paper)',
                    fontSize: 15.5,
                    lineHeight: 1.6,
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.borderColor = 'rgba(224,201,119,0.35)';
                      e.currentTarget.style.background = 'rgba(15,36,56,0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.borderColor = 'rgba(169,187,208,0.12)';
                      e.currentTarget.style.background = 'rgba(15,36,56,0.4)';
                    }
                  }}
                >
                  <span
                    className="font-serif"
                    style={{
                      marginTop: 1,
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '999px',
                      border: selected
                        ? '1px solid rgba(224,201,119,0.7)'
                        : '1px solid rgba(169,187,208,0.25)',
                      color: selected
                        ? 'var(--color-sail-gold-soft)'
                        : 'var(--color-sail-mist)',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {choice.key.toUpperCase()}
                  </span>
                  <span>{choice.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
