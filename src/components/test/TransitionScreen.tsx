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
      <div
        className="rounded-modal border p-10 text-sail-paper md:p-12"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,36,56,0.7), rgba(10,22,40,0.85))',
          borderColor: 'rgba(201,162,39,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-6 text-6xl"
        >
          {emoji}
        </motion.div>
        <h2
          className="mb-4 font-serif text-sail-paper"
          style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.005em' }}
        >
          {message}
        </h2>
        {subMessage && (
          <p className="mb-9 text-sail-mist" style={{ fontSize: 15, lineHeight: 1.75 }}>
            {subMessage}
          </p>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center justify-center rounded-btn transition-all duration-300 hover:-translate-y-[2px]"
          style={{
            background:
              'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
            color: '#0A1628',
            fontWeight: 700,
            padding: '14px 32px',
            fontSize: 15,
            letterSpacing: '0.04em',
            boxShadow: 'var(--shadow-gold)',
            fontFamily: 'var(--font-korean)',
          }}
        >
          계속하기 ({autoCountdown})
        </button>
      </div>
    </motion.div>
  );
}
