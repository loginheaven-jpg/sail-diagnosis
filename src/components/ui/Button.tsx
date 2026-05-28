/**
 * Button — SAIL Design System v1.0
 * 규칙: SAIL_DESIGN_SYSTEM.md § 5.1
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
    'bg-sail-orange text-white shadow-card hover:bg-sail-orange-hover hover:shadow-card-hover active:translate-y-px',
  secondary: 'bg-sail-navy text-white hover:bg-sail-navy-light',
  outline:
    'border border-sail-navy bg-transparent text-sail-navy hover:bg-sail-navy-bg',
  ghost: 'bg-transparent text-sail-gray-700 hover:bg-sail-gray-100',
  danger: 'bg-sail-danger text-white hover:opacity-90',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-4 text-bodySm font-medium',
  md: 'h-10 px-5 text-body font-semibold',
  lg: 'h-12 px-6 text-body-lg font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-button transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
