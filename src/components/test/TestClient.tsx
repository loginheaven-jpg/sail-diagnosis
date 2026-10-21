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

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { IntroScreen } from '@/components/test/IntroScreen';
import { PhaseChoice } from '@/components/test/PhaseChoice';
import { PhaseScenario } from '@/components/test/PhaseScenario';
import { PhaseSpectrum } from '@/components/test/PhaseSpectrum';
import { TransitionScreen } from '@/components/test/TransitionScreen';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTestStore } from '@/stores/test-store';

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
  const searchParams = useSearchParams();
  // ?group=XXXXX 또는 ?session=XXXXX (레거시 호환)
  const groupParam =
    searchParams.get('group') ?? searchParams.get('session');

  const isStarted = useTestStore((s) => s.isStarted);
  const isCompleted = useTestStore((s) => s.isCompleted);
  const phase = useTestStore((s) => s.phase);
  const questionIndex = useTestStore((s) => s.questionIndex);
  const nickname = useTestStore((s) => s.nickname);
  const groupCode = useTestStore((s) => s.groupCode);
  const answers = useTestStore((s) => s.answers);
  const requestId = useTestStore((s) => s.requestId);
  const shareWithCoach = useTestStore((s) => s.shareWithCoach);
  const setShareWithCoach = useTestStore((s) => s.setShareWithCoach);

  const [acknowledgedPhase, setAcknowledgedPhase] = useState(phase);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const submission = useRef<Promise<string> | null>(null);

  // A completion has one idempotency key. Changing the loading/error UI must
  // not cancel the request or automatically retry a failed save.
  useEffect(() => {
    if (!isCompleted || !requestId) return;
    let current = true;
    if (!submission.current) {
      submission.current = (async () => {
        const session = await fetch('/api/diagnosis/session', {
          method: 'POST', credentials: 'same-origin', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        if (!session.ok) throw new Error('참여 세션을 준비하지 못했습니다. 다시 시도해 주세요.');
        const response = await fetch('/api/diagnosis', {
          method: 'POST', credentials: 'same-origin', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname, groupCode, answers, requestId, shareWithCoach, device: navigator.userAgent }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.id)) {
          throw new Error(typeof data.error === 'string' ? data.error : '결과를 저장하지 못했습니다. 다시 시도해 주세요.');
        }
        return data.id as string;
      })();
    }
    const pending = submission.current;
    void pending.then(id => {
      if (!current) return;
      useTestStore.getState().reset();
      window.location.assign(`/result/${id}`);
    }).catch(failure => {
      if (!current) return;
      if (submission.current === pending) submission.current = null;
      setErrorMsg(failure instanceof Error ? failure.message : '결과를 저장하지 못했습니다.');
    });
    return () => { current = false; };
  }, [isCompleted, attempt, nickname, groupCode, answers, requestId, shareWithCoach]);

  // === 화면 분기 ===
  if (!isStarted) {
    return <IntroScreen prefilledGroupCode={groupParam} />;
  }

  if (isCompleted && !errorMsg) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="text-center">
          <div className="mb-5 text-5xl animate-pulse">🧭</div>
          <p
            className="font-serif text-sail-paper"
            style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.005em' }}
          >
            나침반을 그리는 중…
          </p>
          <p className="mt-3 text-sail-mist" style={{ fontSize: 14 }}>
            잠시만 기다려주세요.
          </p>
        </div>
      </main>
    );
  }

  if (isCompleted && errorMsg) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 text-5xl">⚠️</div>
          <p
            className="mb-3 font-serif text-sail-paper"
            style={{ fontSize: 22, fontWeight: 500 }}
          >
            결과 저장에 실패했어요
          </p>
          <p className="mb-7 text-sail-mist" style={{ fontSize: 14, lineHeight: 1.7 }}>
            {errorMsg}
          </p>
          <button
            onClick={() => { setErrorMsg(null); setAttempt(value => value + 1); }}
            className="inline-flex items-center justify-center rounded-btn transition-all duration-300 hover:-translate-y-[2px]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
              color: '#0A1628',
              fontWeight: 700,
              padding: '14px 30px',
              fontSize: 15,
              letterSpacing: '0.04em',
              boxShadow: 'var(--shadow-gold)',
              fontFamily: 'var(--font-korean)',
            }}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  if ((phase === 2 || phase === 3) && phase !== acknowledgedPhase) {
    const t = TRANSITION_MESSAGES[phase];
    if (t) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <TransitionScreen
            emoji={t.emoji}
            message={t.message}
            subMessage={t.subMessage}
            onContinue={() => {
              setAcknowledgedPhase(phase);
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

      {phase === 3 && questionIndex === 9 && groupCode && (
        <label className="mb-5 flex w-full max-w-2xl items-start gap-3 rounded-card border p-4 text-sm leading-6 text-sail-mist" style={{ borderColor: 'rgba(201,162,39,0.2)' }}>
          <input type="checkbox" checked={shareWithCoach} onChange={event => setShareWithCoach(event.target.checked)} className="mt-1" />
          <span>이 결과를 입력한 그룹의 담당 코치에게 공유합니다. <span className="text-sail-gold">선택</span><br />동의하지 않아도 본인의 진단과 결과 열람은 이용할 수 있습니다. 코치 공유 동의는 최대 30일이며 결과 화면에서 언제든 철회할 수 있습니다. 본인 접근 권한이 유효한 동안 결과 화면에서 철회할 수 있습니다.</span>
        </label>
      )}

      {/* Phase 컴포넌트 */}
      <div className="flex w-full flex-1 items-start justify-center">
        {phase === 1 && <PhaseScenario />}
        {phase === 2 && <PhaseChoice />}
        {phase === 3 && <PhaseSpectrum />}
      </div>
    </main>
  );
}
