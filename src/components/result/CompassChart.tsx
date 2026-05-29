'use client';

/**
 * CompassChart — SAIL 나침반 2×2 매트릭스 (Quiet Luxury v2.0)
 *
 * 다크 네이비 배경 위에 4개의 미묘한 사분면 + 골드 강조 사용자 위치.
 * 축 라벨은 영문 우선 (Tell/Ask, Control/Emote).
 *
 * X축: 감정표현성 s (-1=Control 좌 ↔ +1=Emote 우)
 * Y축: 주도성 i      (-1=Ask  하 ↔ +1=Tell  상)
 */

import {
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts';

import { SAIL_TYPES, type SailType } from '@/types/sail';

interface CompassChartProps {
  /** 정규화된 주도성 [-1, +1] */
  i: number;
  /** 정규화된 감정표현성 [-1, +1] */
  s: number;
  dominantType: SailType;
}

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#6B3FA0',
  L: '#2E9E6B',
};

export function CompassChart({ i, s, dominantType }: CompassChartProps) {
  const userPoint = [{ x: s, y: i }];
  const userTypeHex = TYPE_HEX[dominantType];

  return (
    <section
      className="rounded-modal border p-7 md:p-9"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
        borderColor: 'rgba(201,162,39,0.15)',
      }}
    >
      <p
        className="font-serif text-sail-gold"
        style={{
          fontSize: 11,
          letterSpacing: '0.32em',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        Compass
      </p>
      <h2
        className="mt-2 font-serif text-sail-paper"
        style={{
          fontSize: 'clamp(22px, 2.6vw, 26px)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        당신의 좌표
      </h2>
      <p
        className="mt-2 text-sail-mist/80"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        Assertiveness(주도성, 세로) × Responsiveness(감정표현성, 가로)
      </p>

      <div
        className="relative mx-auto mt-7"
        style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: 460 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 16, bottom: 24, left: 24 }}>
            {/* 사분면 배경 — 유형 컬러 매우 옅게 */}
            <ReferenceArea x1={-1} x2={0} y1={0} y2={1} fill={TYPE_HEX.S} fillOpacity={0.1} />
            <ReferenceArea x1={0} x2={1} y1={0} y2={1} fill={TYPE_HEX.A} fillOpacity={0.1} />
            <ReferenceArea x1={-1} x2={0} y1={-1} y2={0} fill={TYPE_HEX.I} fillOpacity={0.1} />
            <ReferenceArea x1={0} x2={1} y1={-1} y2={0} fill={TYPE_HEX.L} fillOpacity={0.1} />

            <CartesianGrid stroke="rgba(232,237,242,0.06)" strokeDasharray="2 3" />

            <XAxis
              type="number"
              dataKey="x"
              domain={[-1, 1]}
              ticks={[-1, 0, 1]}
              tick={false}
              axisLine={{ stroke: 'rgba(201,162,39,0.25)' }}
              tickLine={false}
              label={{
                value: 'CONTROL  ←  RESPONSIVENESS  →  EMOTE',
                position: 'bottom',
                offset: 4,
                style: {
                  fill: 'rgba(232,237,242,0.55)',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  fontFamily: 'var(--font-serif)',
                },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-1, 1]}
              ticks={[-1, 0, 1]}
              tick={false}
              axisLine={{ stroke: 'rgba(201,162,39,0.25)' }}
              tickLine={false}
              label={{
                value: 'TELL  ↑  ASSERTIVENESS  ↓  ASK',
                angle: -90,
                position: 'insideLeft',
                offset: 16,
                style: {
                  fill: 'rgba(232,237,242,0.55)',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  fontFamily: 'var(--font-serif)',
                  textAnchor: 'middle',
                },
              }}
            />

            {/* 4유형 중심점 라벨 */}
            <ReferenceDot
              x={-0.5}
              y={+0.5}
              r={0}
              label={{
                value: `${SAIL_TYPES.S.emoji}  S`,
                fill: TYPE_HEX.S,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
                position: 'center',
              }}
            />
            <ReferenceDot
              x={+0.5}
              y={+0.5}
              r={0}
              label={{
                value: `${SAIL_TYPES.A.emoji}  A`,
                fill: TYPE_HEX.A,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
                position: 'center',
              }}
            />
            <ReferenceDot
              x={-0.5}
              y={-0.5}
              r={0}
              label={{
                value: `${SAIL_TYPES.I.emoji}  I`,
                fill: TYPE_HEX.I,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
                position: 'center',
              }}
            />
            <ReferenceDot
              x={+0.5}
              y={-0.5}
              r={0}
              label={{
                value: `${SAIL_TYPES.L.emoji}  L`,
                fill: TYPE_HEX.L,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
                position: 'center',
              }}
            />

            {/* 사용자 위치 — 골드 외곽 + 유형 색 내부 */}
            <Scatter name="당신" data={userPoint} fill={userTypeHex} shape="circle" />
            <ReferenceDot
              x={s}
              y={i}
              r={9}
              stroke="#C9A227"
              strokeWidth={2.5}
              fill={userTypeHex}
            />
            <ReferenceDot
              x={s}
              y={i}
              r={16}
              stroke="rgba(201,162,39,0.35)"
              strokeWidth={1}
              fill="transparent"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p
        className="mt-5 text-center text-sail-mist/70"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          letterSpacing: '0.18em',
          fontWeight: 500,
        }}
      >
        ({i >= 0 ? '+' : ''}
        {i.toFixed(2)},&nbsp; {s >= 0 ? '+' : ''}
        {s.toFixed(2)})
      </p>
    </section>
  );
}
