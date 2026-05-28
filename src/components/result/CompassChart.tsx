'use client';

/**
 * CompassChart — 나침반 2×2 매트릭스
 *
 * X축: 감정표현성 s (-1=Control 좌 ↔ +1=Emote 우)
 * Y축: 주도성 i      (-1=Ask  하 ↔ +1=Tell  상)
 *
 * 사분면:
 *   상단-좌 (i>0, s<0) : S Skipper      (Tell + Control)
 *   상단-우 (i>0, s>0) : A Adventurer   (Tell + Emote)
 *   하단-좌 (i<0, s<0) : I Interpreter  (Ask + Control)
 *   하단-우 (i<0, s>0) : L Lifeguard    (Ask + Emote)
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

export function CompassChart({ i, s, dominantType }: CompassChartProps) {
  const userPoint = [{ x: s, y: i }];

  return (
    <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <h2 className="mb-1 text-h3 font-bold text-sail-navy">SAIL 나침반</h2>
      <p className="mb-5 text-bodySm text-sail-gray-600">
        주도성(세로) × 감정표현성(가로) 두 축 위의 당신의 위치
      </p>

      <div className="relative" style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: 480, margin: '0 auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            {/* 사분면 배경 (유형 색상 6% alpha) */}
            <ReferenceArea x1={-1} x2={0} y1={0} y2={1} fill="var(--color-sail-s-tint)" />
            <ReferenceArea x1={0} x2={1} y1={0} y2={1} fill="var(--color-sail-a-tint)" />
            <ReferenceArea x1={-1} x2={0} y1={-1} y2={0} fill="var(--color-sail-i-tint)" />
            <ReferenceArea x1={0} x2={1} y1={-1} y2={0} fill="var(--color-sail-l-tint)" />

            <CartesianGrid stroke="var(--color-sail-gray-200)" strokeDasharray="2 2" />

            <XAxis
              type="number"
              dataKey="x"
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tick={false}
              axisLine={{ stroke: 'var(--color-sail-gray-300)' }}
              tickLine={false}
              label={{
                value: 'Control ← 감정표현성 → Emote',
                position: 'bottom',
                offset: -4,
                style: {
                  fill: 'var(--color-sail-gray-500)',
                  fontSize: 11,
                  fontWeight: 500,
                },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-1, 1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              tick={false}
              axisLine={{ stroke: 'var(--color-sail-gray-300)' }}
              tickLine={false}
              label={{
                value: 'Tell ↑ 주도성 ↓ Ask',
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                style: {
                  fill: 'var(--color-sail-gray-500)',
                  fontSize: 11,
                  fontWeight: 500,
                  textAnchor: 'middle',
                },
              }}
            />

            {/* 4유형 중심점 라벨 (작은 점 + 라벨) */}
            <ReferenceDot x={-0.5} y={+0.5} r={0} label={{ value: `${SAIL_TYPES.S.emoji} S`, fill: SAIL_TYPES.S.color, fontSize: 13, fontWeight: 700, position: 'center' }} />
            <ReferenceDot x={+0.5} y={+0.5} r={0} label={{ value: `${SAIL_TYPES.A.emoji} A`, fill: SAIL_TYPES.A.color, fontSize: 13, fontWeight: 700, position: 'center' }} />
            <ReferenceDot x={-0.5} y={-0.5} r={0} label={{ value: `${SAIL_TYPES.I.emoji} I`, fill: SAIL_TYPES.I.color, fontSize: 13, fontWeight: 700, position: 'center' }} />
            <ReferenceDot x={+0.5} y={-0.5} r={0} label={{ value: `${SAIL_TYPES.L.emoji} L`, fill: SAIL_TYPES.L.color, fontSize: 13, fontWeight: 700, position: 'center' }} />

            {/* 사용자 위치 */}
            <Scatter
              name="당신"
              data={userPoint}
              fill={SAIL_TYPES[dominantType].color}
              shape="circle"
            />

            {/* 사용자 위치 강조 (큰 ring) */}
            <ReferenceDot
              x={s}
              y={i}
              r={10}
              stroke={SAIL_TYPES[dominantType].color}
              strokeWidth={3}
              fill="white"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-center font-mono text-tiny text-sail-gray-500">
        좌표: (주도성={i.toFixed(2)}, 감정표현성={s.toFixed(2)})
      </p>
    </section>
  );
}
