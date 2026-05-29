/**
 * Card — SAIL Design System v2.0 (Quiet Luxury)
 * 규칙: SAIL_DESIGN_SYSTEM.md § 7.2 / 7.4
 *
 * default  → 일반 카드 (네이비 그라데이션 + 미스트 보더)
 * question → 진단 문항 카드 (조금 더 깊은 그라데이션 + 골드 보더)
 */

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'question';
  interactive?: boolean;
}

const DEFAULT_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
  borderColor: 'rgba(169,187,208,0.12)',
};

const QUESTION_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(15,36,56,0.7) 0%, rgba(10,22,40,0.7) 100%)',
  borderColor: 'rgba(201,162,39,0.15)',
};

export function Card({
  variant = 'default',
  interactive = false,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  const surfaceStyle = variant === 'question' ? QUESTION_STYLE : DEFAULT_STYLE;
  return (
    <div
      className={cn(
        'border text-sail-paper',
        variant === 'default' && 'rounded-card p-card',
        variant === 'question' && 'rounded-question p-question md:p-question',
        interactive &&
          'cursor-pointer transition-all duration-300 hover:-translate-y-[1px]',
        className
      )}
      style={{ ...surfaceStyle, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
