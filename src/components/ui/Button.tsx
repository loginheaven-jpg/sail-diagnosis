/**
 * Button — SAIL Design System v2.0 Quiet Luxury
 *
 * - primary: 골드 그라데이션, 어두운 텍스트, 강한 발광 그림자
 * - secondary: 깊은 네이비 + paper 텍스트
 * - outline: 투명 + mist 보더 (호버 시 골드)
 * - ghost: 텍스트만
 * - danger: 빨강
 *
 * 모서리 2px (radius-btn), 폰트 leters spacing 0.04em
 */

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'text-sail-abyss font-bold transition-all duration-300 hover:-translate-y-[2px] active:translate-y-0',
  secondary:
    'bg-sail-navy text-sail-paper border border-sail-gold-soft/20 hover:bg-sail-slate transition-all',
  outline:
    'border border-sail-mist/30 text-sail-paper hover:border-sail-gold-soft hover:text-sail-gold-soft transition-all',
  ghost:
    'text-sail-mist hover:text-sail-gold-soft transition-all',
  danger:
    'bg-sail-danger text-sail-abyss font-bold hover:brightness-110 transition-all',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-4 py-2 text-bodySm',
  md: 'px-6 py-3 text-body-sm',
  lg: 'px-[34px] py-4 text-body',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  style,
  children,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className
      )}
      style={{
        fontFamily: 'var(--font-korean)',
        letterSpacing: '0.04em',
        ...(isPrimary
          ? {
              background:
                'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
              boxShadow: 'var(--shadow-gold)',
            }
          : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
