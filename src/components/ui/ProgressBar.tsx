/**
 * ProgressBar — 30문항 진행 표시 (Quiet Luxury v2.0)
 * 규칙: SAIL_DESIGN_SYSTEM.md § 7.6
 *  track 3px, mist 12%
 *  fill  3px gold → gold-soft 그라데이션
 */

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ current, total, label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className={cn('w-full', className)}>
      {label !== undefined && (
        <div className="mb-2.5 flex items-center justify-between">
          <span
            className="font-serif text-sail-paper"
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
          <span
            className="text-sail-mist"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              letterSpacing: '0.05em',
            }}
          >
            {current} / {total}
          </span>
        </div>
      )}
      <div
        className="h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(169,187,208,0.12)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
