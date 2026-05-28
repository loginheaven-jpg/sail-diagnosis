'use client';

/**
 * TransitionScreen — Phase 전환 격려 화면
 *
 * Phase 1 → 2 → 3 사이에 표시. 3초 정도 자동 대기 후 사라지거나, 클릭 시 즉시.
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';

interface TransitionScreenProps {
  message: string;
  subMessage?: string;
  emoji?: string;
  onContinue: () => void;
}

export function TransitionScreen({
  message,
  subMessage,
  emoji = '🌊',
  onContinue,
}: TransitionScreenProps) {
  const [autoCountdown, setAutoCountdown] = useState(3);

  useEffect(() => {
    if (autoCountdown <= 0) {
      onContinue();
      return;
    }
    const timer = setTimeout(() => setAutoCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [autoCountdown, onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl text-center"
    >
      <div className="rounded-question bg-sail-navy p-10 text-white shadow-card-hover md:p-12">
        <motion.div
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-6 text-6xl"
        >
          {emoji}
        </motion.div>
        <h2 className="mb-3 text-h2 font-bold">{message}</h2>
        {subMessage && (
          <p className="mb-8 text-body opacity-80">{subMessage}</p>
        )}
        <Button variant="primary" size="lg" onClick={onContinue}>
          계속하기 ({autoCountdown})
        </Button>
      </div>
    </motion.div>
  );
}
