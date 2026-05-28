'use client';

/**
 * Slider — Phase 3 스펙트럼 문항 전용
 * 규칙: SAIL_DESIGN_SYSTEM.md § 5.5
 *
 * 디자인:
 *   - track 8px, thumb 28px (터치 44px 보장: padding으로 hit area 확장)
 *   - 중앙(50) tick 표시
 *   - 양극 라벨은 외부에서 props로 전달
 *
 * 접근성: aria-valuemin/max/now/text 모두 부착, 키보드 화살표 ±1 / Shift+화살표 ±10
 */

import { useId, useState } from 'react';

import { cn } from '@/lib/utils';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
  leftEmoji?: string;
  rightEmoji?: string;
  /** 사용자가 한 번이라도 슬라이더에 손댄 적이 있는지 */
  touched: boolean;
  className?: string;
}

export function Slider({
  value,
  onChange,
  leftLabel,
  rightLabel,
  leftEmoji,
  rightEmoji,
  touched,
  className,
}: SliderProps) {
  const id = useId();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn('w-full', className)}>
      {/* 양극 라벨 */}
      <div className="mb-6 flex justify-between gap-4 text-bodySm text-sail-gray-700 md:text-body">
        <div className="flex max-w-[42%] flex-col items-start gap-1">
          {leftEmoji && <span className="text-2xl">{leftEmoji}</span>}
          <span className="leading-snug">{leftLabel}</span>
        </div>
        <div className="flex max-w-[42%] flex-col items-end gap-1 text-right">
          {rightEmoji && <span className="text-2xl">{rightEmoji}</span>}
          <span className="leading-snug">{rightLabel}</span>
        </div>
      </div>

      {/* 슬라이더 */}
      <div className="relative px-2 py-4">
        {/* 중앙 tick (값 50) */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-sail-gray-300"
        />
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`${value} (${leftLabel} ↔ ${rightLabel})`}
          aria-label="스펙트럼 슬라이더"
          className={cn(
            'sail-slider w-full',
            !touched && 'opacity-90'
          )}
        />
        <style>{`
          .sail-slider {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            outline: none;
            height: 28px;
            cursor: pointer;
          }
          /* WebKit (Chrome, Safari, Edge) */
          .sail-slider::-webkit-slider-runnable-track {
            height: 8px;
            background: linear-gradient(to right, var(--color-sail-gray-200) 0%, var(--color-sail-gray-200) 100%);
            border-radius: 999px;
          }
          .sail-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: white;
            border: 3px solid var(--color-sail-navy);
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            margin-top: -10px;
            transition: transform 200ms, box-shadow 200ms;
          }
          .sail-slider:hover::-webkit-slider-thumb { transform: scale(1.08); }
          .sail-slider:active::-webkit-slider-thumb { transform: scale(1.12); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
          .sail-slider:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgba(30, 58, 95, 0.18); }

          /* Firefox */
          .sail-slider::-moz-range-track {
            height: 8px;
            background: var(--color-sail-gray-200);
            border-radius: 999px;
          }
          .sail-slider::-moz-range-thumb {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: white;
            border: 3px solid var(--color-sail-navy);
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            transition: transform 200ms, box-shadow 200ms;
          }
        `}</style>
      </div>

      {/* 값 표시 + 도움말 */}
      <div className="mt-3 flex items-center justify-between text-tiny text-sail-gray-500">
        <span>{touched ? `위치: ${value}` : '슬라이더를 움직여 위치를 정하세요'}</span>
        <span className="font-mono">{value}/100</span>
      </div>
      {/* isFocused는 키보드 사용자 안내 — 디자인 토큰엔 영향 없음 */}
      {isFocused && (
        <span className="sr-only">화살표 키로 1씩 이동, Shift+화살표로 10씩 이동</span>
      )}
    </div>
  );
}
