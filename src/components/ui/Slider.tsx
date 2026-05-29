'use client';

/**
 * Slider — Phase 3 스펙트럼 문항 전용 (Quiet Luxury v2.0)
 * 규칙: SAIL_DESIGN_SYSTEM.md § 7.5
 *
 *   track 8px, mist 15% 배경, fill = foam → gold 그라데이션
 *   thumb 28px paper + gold 3px border + gold glow
 *   center tick 1px mist height 16px
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
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('w-full', className)}>
      {/* 양극 라벨 */}
      <div
        className="mb-7 flex justify-between gap-4 text-sail-paper"
        style={{
          fontFamily: 'var(--font-korean)',
          fontSize: 15,
          lineHeight: 1.55,
        }}
      >
        <div className="flex max-w-[42%] flex-col items-start gap-1.5">
          {leftEmoji && <span style={{ fontSize: 24 }}>{leftEmoji}</span>}
          <span>{leftLabel}</span>
        </div>
        <div className="flex max-w-[42%] flex-col items-end gap-1.5 text-right">
          {rightEmoji && <span style={{ fontSize: 24 }}>{rightEmoji}</span>}
          <span>{rightLabel}</span>
        </div>
      </div>

      {/* 슬라이더 */}
      <div className="relative px-2 py-4">
        {/* 중앙 tick (값 50) */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            height: 16,
            width: 1,
            background: 'rgba(169,187,208,0.45)',
          }}
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
          className={cn('sail-slider w-full', !touched && 'opacity-90')}
          style={
            {
              '--sail-slider-pct': `${pct}%`,
            } as React.CSSProperties
          }
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
          /* WebKit */
          .sail-slider::-webkit-slider-runnable-track {
            height: 8px;
            background:
              linear-gradient(90deg,
                var(--color-sail-foam) 0%,
                var(--color-sail-gold) var(--sail-slider-pct, 50%),
                rgba(169,187,208,0.15) var(--sail-slider-pct, 50%),
                rgba(169,187,208,0.15) 100%);
            border-radius: 999px;
          }
          .sail-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--color-sail-paper);
            border: 3px solid var(--color-sail-gold);
            box-shadow: 0 2px 12px rgba(201,162,39,0.4);
            margin-top: -10px;
            transition: transform 200ms, box-shadow 200ms;
          }
          .sail-slider:hover::-webkit-slider-thumb {
            transform: scale(1.08);
            box-shadow: 0 4px 16px rgba(201,162,39,0.55);
          }
          .sail-slider:active::-webkit-slider-thumb {
            transform: scale(1.12);
          }
          .sail-slider:focus-visible::-webkit-slider-thumb {
            box-shadow: 0 0 0 4px rgba(201,162,39,0.25),
                        0 2px 12px rgba(201,162,39,0.5);
          }

          /* Firefox */
          .sail-slider::-moz-range-track {
            height: 8px;
            background: rgba(169,187,208,0.15);
            border-radius: 999px;
          }
          .sail-slider::-moz-range-progress {
            height: 8px;
            background:
              linear-gradient(90deg,
                var(--color-sail-foam) 0%,
                var(--color-sail-gold) 100%);
            border-radius: 999px;
          }
          .sail-slider::-moz-range-thumb {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--color-sail-paper);
            border: 3px solid var(--color-sail-gold);
            box-shadow: 0 2px 12px rgba(201,162,39,0.4);
            transition: transform 200ms, box-shadow 200ms;
          }
        `}</style>
      </div>

      {/* 값 표시 + 도움말 */}
      <div
        className="mt-3 flex items-center justify-between text-sail-mist"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          letterSpacing: '0.1em',
        }}
      >
        <span>
          {touched ? `위치: ${value}` : '슬라이더를 움직여 위치를 정하세요'}
        </span>
        <span style={{ color: 'var(--color-sail-gold)', fontWeight: 600 }}>
          {value}/100
        </span>
      </div>
      {isFocused && (
        <span className="sr-only">화살표 키로 1씩 이동, Shift+화살표로 10씩 이동</span>
      )}
    </div>
  );
}
