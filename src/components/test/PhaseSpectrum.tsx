'use client';

/**
 * PhaseSpectrum — Phase 3 (성향 스펙트럼: 슬라이더 0~100)
 *
 * - 양극 라벨 + 슬라이더
 * - "다음" 버튼 명시적 클릭으로 진행 (슬라이더는 미세 조정이 필요하므로 자동 진행 안 함)
 * - 기본값 50 (중립). 사용자가 한 번이라도 손대지 않으면 다음 진행 비활성
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { phase3Questions } from '@/data/questions';
import { useTestStore } from '@/stores/test-store';

const slideVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function PhaseSpectrum() {
  const questionIndex = useTestStore((s) => s.questionIndex);
  const answers = useTestStore((s) => s.answers);
  const answerQuestion = useTestStore((s) => s.answerQuestion);
  const nextQuestion = useTestStore((s) => s.nextQuestion);
  const completePhase = useTestStore((s) => s.completePhase);

  const q = phase3Questions[questionIndex];
  const existing = answers[q.id];
  const initialValue = typeof existing === 'number' ? existing : 50;
  const [value, setValue] = useState<number>(initialValue);
  const [touched, setTouched] = useState<boolean>(typeof existing === 'number');

  // 문항이 바뀔 때마다 로컬 상태 리셋
  useEffect(() => {
    const a = answers[q.id];
    if (typeof a === 'number') {
      setValue(a);
      setTouched(true);
    } else {
      setValue(50);
      setTouched(false);
    }
  }, [q.id, answers]);

  const handleChange = (v: number) => {
    setValue(v);
    if (!touched) setTouched(true);
    answerQuestion(q.id, v);
  };

  const handleNext = () => {
    if (!touched) return;
    // 마지막 응답 보장
    answerQuestion(q.id, value);
    if (questionIndex >= phase3Questions.length - 1) {
      completePhase();
    } else {
      nextQuestion();
    }
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
            {q.id} · 성향 스펙트럼
          </p>

          <h2 className="mb-8 text-body-lg leading-relaxed font-medium text-sail-gray-900 md:text-h4">
            아래 두 표현 사이에서 당신의 위치를 정해주세요
          </h2>

          <Slider
            value={value}
            onChange={handleChange}
            leftLabel={q.leftLabel}
            rightLabel={q.rightLabel}
            leftEmoji={q.leftEmoji}
            rightEmoji={q.rightEmoji}
            touched={touched}
          />

          <div className="mt-8 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={!touched}
            >
              {questionIndex >= phase3Questions.length - 1
                ? '결과 보기 →'
                : '다음 →'}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
