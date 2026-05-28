import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        {/* 로고 마크 */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sail-orange text-2xl text-white shadow-card">
            ⛵
          </div>
          <span className="text-h3 font-bold text-sail-navy">SAIL</span>
        </div>

        {/* 타이틀 */}
        <h1 className="mb-4 text-display font-bold tracking-tight text-sail-gray-900 sm:text-5xl">
          당신은 이 항해에서<br />
          어떤 <span className="text-sail-orange">역할</span>을 하고 있습니까?
        </h1>

        <p className="mx-auto mb-3 max-w-md text-body-lg leading-relaxed text-sail-gray-600">
          Merrill-Reid 이론 기반 30문항 소통 스타일 진단.
          <br />
          7~9분이면 충분합니다.
        </p>
        <p className="mx-auto mb-12 max-w-md text-bodySm text-sail-gray-500">
          주도성(Ask↔Tell) × 감정표현성(Control↔Emote) 두 축으로 자신의 소통 스타일을 확인하세요.
        </p>

        {/* 4유형 미리보기 */}
        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              code: 'S',
              name: 'Skipper',
              kr: '선장',
              combo: 'Tell+Control',
              emoji: '⚓',
              bg: 'bg-sail-s',
            },
            {
              code: 'A',
              name: 'Adventurer',
              kr: '모험가',
              combo: 'Tell+Emote',
              emoji: '🌅',
              bg: 'bg-sail-a',
            },
            {
              code: 'I',
              name: 'Interpreter',
              kr: '해석가',
              combo: 'Ask+Control',
              emoji: '🔭',
              bg: 'bg-sail-i',
            },
            {
              code: 'L',
              name: 'Lifeguard',
              kr: '수호자',
              combo: 'Ask+Emote',
              emoji: '🛟',
              bg: 'bg-sail-l',
            },
          ].map((t) => (
            <div
              key={t.code}
              className={`${t.bg} flex flex-col items-center gap-1 rounded-card p-4 text-white shadow-card`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-caption font-medium opacity-80">{t.code}</span>
              <span className="text-bodySm font-semibold">{t.kr}</span>
              <span className="text-tiny font-medium opacity-75">{t.combo}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/test"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-button bg-sail-orange px-6 text-base font-semibold text-white shadow-card transition-all hover:bg-sail-orange-hover hover:shadow-card-hover active:translate-y-px"
          >
            진단 시작하기
          </Link>
          <Link
            href="/guide"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-button border border-sail-gray-300 bg-white px-6 text-base font-semibold text-sail-navy transition-all hover:border-sail-navy hover:bg-sail-navy-bg"
          >
            유형 가이드 보기
          </Link>
        </div>

        <p className="mt-12 text-caption text-sail-gray-500">
          Merrill-Reid Social Styles Model 기반 · 무료
        </p>
      </div>
    </main>
  );
}
