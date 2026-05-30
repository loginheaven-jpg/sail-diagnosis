'use client';

/**
 * CompassChart — SAIL 나침반 2×2 매트릭스 (Quiet Luxury v2.0)
 *
 * X축: 감정표현성 s (-1=Control 좌 ↔ +1=Emote 우)
 * Y축: 주도성      i (-1=Ask 하 ↔ +1=Tell 상)
 *
 * 축 라벨 배치 — 방향성을 명확히 읽히게 분리:
 *   상단 중앙 : TELL  (성향, 크고 굵게)
 *   상단 ↑
 *   좌측 세로  : ASSERTIVENESS (설명, 작고 회색)
 *   중앙 차트
 *   하단 ↓
 *   하단 중앙 : ASK   (성향)
 *   X축 좌끝   : CONTROL (성향)
 *   X축 우끝   : EMOTE   (성향)
 *   X축 중앙   : RESPONSIVENESS (설명)
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
  i: number;
  s: number;
  dominantType: SailType;
}

const TYPE_HEX: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#6B3FA0',
  L: '#2E9E6B',
};

// 성향 (Pole) 토큰 — 크고 선명한 골드
const POLE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: '0.22em',
  color: 'var(--color-sail-gold-soft)',
  textTransform: 'uppercase',
};

// 설명 (Description) 토큰 — 작고 안개색
const DESC_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11.5,
  fontWeight: 500,
  letterSpacing: '0.28em',
  color: 'rgba(169,187,208,0.7)',
  textTransform: 'uppercase',
};

const ARROW_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 18,
  fontWeight: 400,
  color: 'rgba(201,162,39,0.7)',
  lineHeight: 1,
};

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.32em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
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
      <p className="text-sail-gold" style={META_LABEL}>
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

      {/* === 축 + 차트 그리드 ===
            [ TELL                     ]   상단 성향
            [ ↑                        ]   상단 화살표
            [ ASSERT │   chart         ]   좌측 설명(세로) | 차트
            [ ↓                        ]   하단 화살표
            [ ASK                      ]   하단 성향
            [ CONTROL  RESPONS  EMOTE  ]   x축 라벨 행
      */}
      <div className="mx-auto mt-7 w-full" style={{ maxWidth: 520 }}>
        {/* TOP — TELL */}
        <div className="flex justify-center" style={POLE_STYLE}>TELL</div>
        <div className="flex justify-center" style={{ ...ARROW_STYLE, marginTop: 4 }}>↑</div>

        {/* MIDDLE — 좌측 세로 설명 + 차트 */}
        <div className="mt-2 flex items-stretch gap-3">
          {/* 좌측: ASSERTIVENESS (설명, 세로쓰기 — rotate) */}
          <div
            className="flex shrink-0 items-center justify-center"
            style={{ width: 18 }}
          >
            <span
              style={{
                ...DESC_STYLE,
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                whiteSpace: 'nowrap',
              }}
            >
              Assertiveness
            </span>
          </div>

          {/* 차트 */}
          <div
            className="relative flex-1"
            style={{ aspectRatio: '1 / 1' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
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
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[-1, 1]}
                  ticks={[-1, 0, 1]}
                  tick={false}
                  axisLine={{ stroke: 'rgba(201,162,39,0.25)' }}
                  tickLine={false}
                />

                <ReferenceDot
                  x={-0.5}
                  y={+0.5}
                  r={0}
                  label={{
                    value: `${SAIL_TYPES.S.emoji}  S`,
                    fill: TYPE_HEX.S,
                    fontSize: 15,
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
                    fontSize: 15,
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
                    fontSize: 15,
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
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: 'var(--font-serif)',
                    position: 'center',
                  }}
                />

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

          {/* 우측 거터 — 좌측 세로 라벨과 대칭 정렬 */}
          <div style={{ width: 18 }} />
        </div>

        {/* BOTTOM — ↓ ASK */}
        <div className="flex justify-center" style={{ ...ARROW_STYLE, marginTop: 6 }}>↓</div>
        <div className="mt-1 flex justify-center" style={POLE_STYLE}>ASK</div>

        {/* X축 라벨 행: CONTROL | RESPONSIVENESS | EMOTE */}
        <div
          className="mt-5 flex items-baseline justify-between"
          style={{ paddingLeft: 18, paddingRight: 18 }}
        >
          <span style={POLE_STYLE}>← Control</span>
          <span style={DESC_STYLE}>Responsiveness</span>
          <span style={POLE_STYLE}>Emote →</span>
        </div>
      </div>

      <p
        className="mt-6 text-center text-sail-mist/70"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
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
