/**
 * ProgressBar — 30문항 진행 표시
 * 규칙: SAIL_DESIGN_SYSTEM.md § 5.6
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
        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption font-medium text-sail-gray-600">{label}</span>
          <span className="text-caption text-sail-gray-500">
            {current} / {total}
          </span>
        </div>
      )}
      <div
        className="h-1 w-full overflow-hidden rounded-pill bg-sail-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <div
          className="h-full rounded-pill bg-sail-orange transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
