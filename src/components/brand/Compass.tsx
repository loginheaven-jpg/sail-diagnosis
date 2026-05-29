/**
 * Compass — SAIL 브랜드 시그니처
 *
 * 확정 시안 sail_landing_final.html에서 추출. 핵심 요소:
 *   - 3겹 물결 링 (6초 주기, 2초 간격)
 *   - 회전 다이얼 (72초 1회전): 동심원 3개 + 4방위 눈금 + 골드/청록 바늘 + 중심점
 *   - 사분면 라벨 4개 (회전하지 않음): 선장 / 모험가 / 해석가 / 수호자
 *
 * 결과 페이지에서는 props.static=true로 회전 정지 + 사용자 좌표 표시.
 */

interface CompassProps {
  /** 결과 페이지에서는 true — 회전·물결 정지, 사용자 좌표 점 추가 */
  isStatic?: boolean;
  /** 사용자 좌표 (i, s ∈ [-1, +1]) */
  userPoint?: { i: number; s: number; color: string } | null;
  /** 크기 */
  size?: number;
  className?: string;
}

export function Compass({
  isStatic = false,
  userPoint = null,
  size = 370,
  className,
}: CompassProps) {
  // 좌표 변환: i(상=+1) → y(상=22), s(우=+1) → x(우=178) 의 200×200 SVG 기준
  const userX =
    userPoint != null ? 100 + Math.max(-0.95, Math.min(0.95, userPoint.s)) * 78 : null;
  const userY =
    userPoint != null ? 100 - Math.max(-0.95, Math.min(0.95, userPoint.i)) * 78 : null;

  return (
    <div
      className={`compass-ring relative ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {!isStatic && (
        <>
          <div className="ripple" />
          <div className="ripple" />
          <div className="ripple" />
        </>
      )}

      <svg
        viewBox="0 0 200 200"
        className={`dial ${isStatic ? '' : 'rotate-slow'}`}
        aria-hidden="true"
      >
        {/* 동심원 3개 */}
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="none"
          stroke="rgba(127,212,208,.3)"
          strokeWidth="0.5"
        />
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="rgba(201,162,39,.22)"
          strokeWidth="0.5"
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="none"
          stroke="rgba(169,187,208,.14)"
          strokeWidth="0.5"
        />

        {/* 4방위 눈금 */}
        <g stroke="rgba(127,212,208,.4)" strokeWidth="0.7">
          <line x1="100" y1="4" x2="100" y2="14" />
          <line x1="196" y1="100" x2="186" y2="100" />
          <line x1="100" y1="196" x2="100" y2="186" />
          <line x1="4" y1="100" x2="14" y2="100" />
        </g>

        {/* 골드 바늘 (위) + 청록 바늘 (아래) */}
        <polygon
          points="100,22 107,100 100,116 93,100"
          fill="rgba(224,201,119,.9)"
        />
        <polygon
          points="100,178 107,100 100,84 93,100"
          fill="rgba(127,212,208,.5)"
        />

        {/* 중심 */}
        <circle cx="100" cy="100" r="5" fill="#C9A227" />
        <circle cx="100" cy="100" r="2" fill="#0A1628" />

        {/* 사용자 좌표 점 (결과 페이지) — 회전하지 않는 그룹 안으로 분리해야 정확하지만,
            isStatic일 때만 표시되므로 회전 그룹 안에서도 안전 */}
        {isStatic && userX != null && userY != null && userPoint && (
          <>
            <circle
              cx={userX}
              cy={userY}
              r="9"
              fill={userPoint.color}
              opacity="0.18"
            >
              <animate
                attributeName="r"
                values="9;14;9"
                dur="2.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.18;0.05;0.18"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx={userX} cy={userY} r="5" fill={userPoint.color} />
            <circle cx={userX} cy={userY} r="2" fill="#0A1628" />
          </>
        )}
      </svg>

      {/* 사분면 라벨 (회전하지 않음, 절대배치) */}
      <Quad
        ko="선장"
        en="SKIPPER"
        axis="Tell · Control"
        koColor="paper"
        style={{ top: '11%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <Quad
        ko="모험가"
        en="ADVENTURER"
        axis="Tell · Emote"
        koColor="a"
        style={{ top: '50%', right: '-2%', transform: 'translate(0,-50%)' }}
      />
      <Quad
        ko="해석가"
        en="INTERPRETER"
        axis="Ask · Control"
        koColor="i"
        style={{ bottom: '11%', left: '50%', transform: 'translate(-50%,50%)' }}
      />
      <Quad
        ko="수호자"
        en="LIFEGUARD"
        axis="Ask · Emote"
        koColor="l"
        style={{ top: '50%', left: '-2%', transform: 'translate(0,-50%)' }}
      />
    </div>
  );
}

function Quad({
  ko,
  en,
  axis,
  koColor,
  style,
}: {
  ko: string;
  en: string;
  axis: string;
  koColor: 'paper' | 'a' | 'i' | 'l';
  style: React.CSSProperties;
}) {
  const colorClass: Record<typeof koColor, string> = {
    paper: 'text-sail-paper',
    a: 'text-sail-a',
    i: 'text-sail-i',
    l: 'text-sail-l',
  };
  return (
    <div
      className="quad-label absolute"
      style={{ width: 130, ...style }}
    >
      <div
        className={`ko font-serif ${colorClass[koColor]}`}
        style={{ fontSize: 23, fontWeight: 600, letterSpacing: '0.05em' }}
      >
        {ko}
      </div>
      <div
        className="en text-sail-mist"
        style={{ fontSize: 11, letterSpacing: '0.28em', marginTop: 2 }}
      >
        {en}
      </div>
      <div
        className="axis text-sail-mist"
        style={{ fontSize: 10.5, letterSpacing: '0.12em', opacity: 0.65, marginTop: 3 }}
      >
        {axis}
      </div>
    </div>
  );
}
