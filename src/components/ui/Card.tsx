/**
 * Card — SAIL Design System v1.0
 * 규칙: SAIL_DESIGN_SYSTEM.md § 5.2
 */

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 'question'은 진단 문항 카드(rounded-question + 더 큰 padding) */
  variant?: 'default' | 'question';
  interactive?: boolean;
}

export function Card({
  variant = 'default',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-sail-gray-200 shadow-card',
        variant === 'default' && 'rounded-card p-card',
        variant === 'question' && 'rounded-question p-question md:p-question',
        interactive &&
          'cursor-pointer transition-all hover:border-sail-gray-300 hover:shadow-card-hover',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
