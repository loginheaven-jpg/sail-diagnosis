'use client';

/**
 * PhaseScenario — Phase 1 (4지선다 시나리오)
 *
 * - 상황 텍스트 + 4개 선택지 카드
 * - 선택 시 즉시 다음 문항으로 전환 (framer-motion 페이드+슬라이드)
 * - 10문항 완료 → completePhase() 호출
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
        <div className="rounded-question border border-sail-gray-200 bg-white p-6 shadow-card md:p-8">
          {/* 메타 */}
          <p className="mb-2 text-caption font-medium uppercase tracking-wide text-sail-orange">
            {q.id} · 상황 판단
          </p>

          {/* 상황 */}
          <h2 className="mb-6 text-body-lg leading-relaxed font-medium text-sail-gray-900 md:text-h4">
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
                  className={[
                    'w-full rounded-card border-2 px-5 py-4 text-left transition-all',
                    'flex items-start gap-3 text-body leading-relaxed',
                    selected
                      ? 'border-sail-navy bg-sail-navy-bg text-sail-gray-900 shadow-card-hover'
                      : 'border-sail-gray-200 bg-white text-sail-gray-800 hover:border-sail-navy hover:bg-sail-navy-bg/50',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-bodySm font-bold',
                      selected
                        ? 'bg-sail-navy text-white'
                        : 'bg-sail-gray-100 text-sail-gray-600',
                    ].join(' ')}
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
