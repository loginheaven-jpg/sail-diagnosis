'use client';

/**
 * /test — 진단 메인 페이지
 *
 * 진단 진행 상태에 따라 다른 화면을 렌더링:
 *   - !isStarted          → IntroScreen
 *   - phase 1 ~ 3         → PhaseScenario / PhaseChoice / PhaseSpectrum
 *   - phase 전환 직후     → TransitionScreen
 *   - isCompleted         → POST /api/diagnosis → /result/[id] 리다이렉트
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { IntroScreen } from '@/components/test/IntroScreen';
import { PhaseChoice } from '@/components/test/PhaseChoice';
import { PhaseScenario } from '@/components/test/PhaseScenario';
import { PhaseSpectrum } from '@/components/test/PhaseSpectrum';
import { TransitionScreen } from '@/components/test/TransitionScreen';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTestStore } from '@/stores/test-store';

type ViewMode = 'phase' | 'transition' | 'submitting' | 'submit-error';

const PHASE_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Phase 1 · 상황 판단',
  2: 'Phase 2 · 가치 선택',
  3: 'Phase 3 · 성향 스펙트럼',
};

const TRANSITION_MESSAGES = [
  null,
  null,
  {
    emoji: '🧭',
    message: 'Phase 1 완료!',
    subMessage:
      '당신의 항해 스타일이 드러나고 있습니다. 이제 가치 선택으로 넘어갑니다.',
  },
  {
    emoji: '⛵',
    message: '거의 다 왔습니다!',
    subMessage: '마지막 단계입니다. 나침반을 미세 조정합니다.',
  },
] as const;

export default function TestPage() {
  // useSearchParams는 Suspense 경계 안에서 사용해야 정적 생성이 가능하다 (Next.js 16).
  return (
    <Suspense fallback={<TestPageFallback />}>
      <TestPageContent />
    </Suspense>
  );
}

function TestPageFallback() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="text-center">
        <div className="mb-4 text-5xl animate-pulse">⛵</div>
        <p className="text-bodySm text-sail-gray-500">진단을 준비하는 중…</p>
      </div>
    </main>
  );
}

function TestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const isStarted = useTestStore((s) => s.isStarted);
  const isCompleted = useTestStore((s) => s.isCompleted);
  const phase = useTestStore((s) => s.phase);
  const questionIndex = useTestStore((s) => s.questionIndex);
  const nickname = useTestStore((s) => s.nickname);
  const sessionCode = useTestStore((s) => s.sessionCode);
  const answers = useTestStore((s) => s.answers);

  const [mode, setMode] = useState<ViewMode>('phase');
  const [transitionPhase, setTransitionPhase] = useState<2 | 3 | null>(null);
  const [prevPhase, setPrevPhase] = useState<typeof phase>(phase);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Phase 변경 감지 → 전환 화면 (단, phase 1 → 2 그리고 2 → 3만)
  useEffect(() => {
    if (!isStarted) return;
    if (phase !== prevPhase) {
      if (phase === 2 || phase === 3) {
        setTransitionPhase(phase);
        setMode('transition');
      }
      setPrevPhase(phase);
    }
  }, [phase, prevPhase, isStarted]);

  // 진단 완료 → API 저장 → /result/[id]
  useEffect(() => {
    if (!isCompleted || mode === 'submitting') return;
    let cancelled = false;
    setMode('submitting');
    setErrorMsg(null);

    void (async () => {
      try {
        const res = await fetch('/api/diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname,
            sessionCode,
            answers,
            device:
              typeof navigator !== 'undefined' ? navigator.userAgent : null,
          }),
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`결과 저장 실패 (${res.status}): ${detail.slice(0, 120)}`);
        }
        const { id } = (await res.json()) as { id: string };
        if (cancelled) return;
        router.replace(`/result/${id}`);
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setMode('submit-error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCompleted, mode, nickname, sessionCode, answers, router]);

  // === 화면 분기 ===
  if (!isStarted) {
    return <IntroScreen prefilledSessionCode={sessionParam} />;
  }

  if (mode === 'submitting') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="text-center">
          <div className="mb-4 text-5xl animate-pulse">🧭</div>
          <p className="text-h4 font-semibold text-sail-navy">나침반을 그리는 중…</p>
          <p className="mt-2 text-bodySm text-sail-gray-600">잠시만 기다려주세요.</p>
        </div>
      </main>
    );
  }

  if (mode === 'submit-error') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 text-5xl">⚠️</div>
          <p className="mb-2 text-h4 font-semibold text-sail-gray-900">결과 저장에 실패했어요</p>
          <p className="mb-6 text-bodySm text-sail-gray-600">{errorMsg}</p>
          <button
            onClick={() => setMode('phase')}
            className="rounded-button bg-sail-orange px-6 py-3 text-body font-semibold text-white shadow-card hover:bg-sail-orange-hover"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  if (mode === 'transition' && transitionPhase) {
    const t = TRANSITION_MESSAGES[transitionPhase];
    if (t) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <TransitionScreen
            emoji={t.emoji}
            message={t.message}
            subMessage={t.subMessage}
            onContinue={() => {
              setMode('phase');
              setTransitionPhase(null);
            }}
          />
        </main>
      );
    }
  }

  // 진행 중인 Phase 화면
  const phaseLabel = PHASE_LABELS[phase];
  const globalCurrent = (phase - 1) * 10 + questionIndex + 1;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-6 md:py-10">
      {/* 상단 진행 표시 */}
      <div className="mb-6 w-full max-w-2xl">
        <ProgressBar current={globalCurrent} total={30} label={phaseLabel} />
      </div>

      {/* Phase 컴포넌트 */}
      <div className="flex w-full flex-1 items-start justify-center">
        {phase === 1 && <PhaseScenario />}
        {phase === 2 && <PhaseChoice />}
        {phase === 3 && <PhaseSpectrum />}
      </div>
    </main>
  );
}
