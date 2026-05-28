'use client';

/**
 * IntroScreen — 진단 시작 화면
 *
 * - 닉네임 입력 (필수)
 * - 그룹 코드 입력 (5자리, 선택). URL ?group=XXXXX 로 사전 채워질 수 있음
 *   → 실시간 그룹명 미리보기 (코드 입력 완료 시 API로 검증)
 * - 진단 시작 버튼
 */

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useTestStore } from '@/stores/test-store';
import {
  GROUP_CODE_LENGTH,
  GROUP_CODE_REGEX,
  normalizeGroupCode,
} from '@/types/sail';

interface IntroScreenProps {
  prefilledGroupCode?: string | null;
}

type GroupPreview =
  | { state: 'idle' }
  | { state: 'invalid'; message: string }
  | { state: 'checking' }
  | { state: 'found'; name: string }
  | { state: 'not-found'; message: string };

export function IntroScreen({ prefilledGroupCode }: IntroScreenProps) {
  const setNickname = useTestStore((s) => s.setNickname);
  const setGroupCode = useTestStore((s) => s.setGroupCode);
  const startTest = useTestStore((s) => s.startTest);

  const [nickname, setNicknameLocal] = useState('');
  const [groupCodeInput, setGroupCodeInputLocal] = useState(
    prefilledGroupCode ? normalizeGroupCode(prefilledGroupCode) : ''
  );
  const [groupPreview, setGroupPreview] = useState<GroupPreview>({ state: 'idle' });
  const [error, setError] = useState<string | null>(null);

  // 코드가 5자리 형식이 되면 그룹 조회 (debounce 400ms)
  const lastCheckRef = useRef<string>('');
  useEffect(() => {
    const code = normalizeGroupCode(groupCodeInput);
    if (code.length === 0) {
      setGroupPreview({ state: 'idle' });
      return;
    }
    if (!GROUP_CODE_REGEX.test(code)) {
      setGroupPreview({
        state: 'invalid',
        message: `${GROUP_CODE_LENGTH}자리 영숫자입니다 (혼동 글자 0/O/1/I/L 제외).`,
      });
      return;
    }
    setGroupPreview({ state: 'checking' });
    lastCheckRef.current = code;
    const timer = setTimeout(async () => {
      try {
        // 미리보기 — 코드를 dry-run으로 그룹 조회
        // 비로그인이라도 가능하도록 별도 lightweight 엔드포인트 사용
        const res = await fetch(
          `/api/groups/lookup?code=${encodeURIComponent(code)}`,
          { cache: 'no-store' }
        );
        if (lastCheckRef.current !== code) return; // stale
        if (res.ok) {
          const json = (await res.json()) as { name: string };
          setGroupPreview({ state: 'found', name: json.name });
        } else {
          setGroupPreview({
            state: 'not-found',
            message: '존재하지 않거나 만료된 코드입니다.',
          });
        }
      } catch {
        if (lastCheckRef.current !== code) return;
        setGroupPreview({
          state: 'not-found',
          message: '코드 확인 중 오류가 발생했습니다.',
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [groupCodeInput]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length === 0) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    if (trimmed.length > 20) {
      setError('닉네임은 20자 이내로 입력해주세요.');
      return;
    }
    const code = normalizeGroupCode(groupCodeInput);
    if (code.length > 0 && !GROUP_CODE_REGEX.test(code)) {
      setError(`그룹 코드는 ${GROUP_CODE_LENGTH}자리 영숫자여야 합니다.`);
      return;
    }
    if (code.length > 0 && groupPreview.state === 'not-found') {
      setError('존재하지 않는 그룹 코드입니다. 비우거나 올바른 코드를 입력하세요.');
      return;
    }
    setError(null);
    setNickname(trimmed);
    setGroupCode(code || null);
    startTest();
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* 헤더 로고 */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
            ⛵
          </div>
          <h1 className="text-h1 font-bold text-sail-gray-900">SAIL 소통 스타일 진단</h1>
          <p className="text-bodySm text-sail-gray-500">7~9분 · 30문항</p>
        </div>

        {/* 안내 카드 */}
        <div className="mb-8 rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
          <h2 className="mb-3 text-h4 font-bold text-sail-navy">진단 안내</h2>
          <ul className="space-y-2 text-bodySm text-sail-gray-700">
            <li className="flex gap-2">
              <span className="text-sail-orange">✓</span>
              <span>총 30문항을 3단계로 응답합니다 (상황 판단 → 가치 선택 → 성향 스펙트럼)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sail-orange">✓</span>
              <span>정답은 없습니다. <strong>직관적으로</strong> 가장 가까운 응답을 선택하세요</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sail-orange">✓</span>
              <span>완료 후 4유형(S/A/I/L) 중 자신의 주 스타일과 항해 프로필을 받습니다</span>
            </li>
          </ul>
        </div>

        <form onSubmit={handleStart} className="space-y-5">
          <div>
            <label
              htmlFor="nickname"
              className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800"
            >
              닉네임 <span className="text-sail-danger">*</span>
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNicknameLocal(e.currentTarget.value)}
              placeholder="결과 화면에 표시될 이름"
              maxLength={20}
              autoComplete="off"
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body text-sail-gray-900 placeholder:text-sail-gray-400 focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
            <p className="mt-1 text-caption text-sail-gray-500">최대 20자. 본명일 필요 없습니다.</p>
          </div>

          <div>
            <label
              htmlFor="group"
              className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800"
            >
              그룹 코드 <span className="font-normal text-sail-gray-500">(선택)</span>
            </label>
            <input
              id="group"
              type="text"
              value={groupCodeInput}
              onChange={(e) =>
                setGroupCodeInputLocal(
                  normalizeGroupCode(e.currentTarget.value).slice(0, GROUP_CODE_LENGTH)
                )
              }
              placeholder={'예: ABCD7'}
              maxLength={GROUP_CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body font-mono tracking-widest text-sail-gray-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-sail-gray-400 focus:border-sail-navy focus:shadow-focus focus:outline-none uppercase"
            />
            <div className="mt-1 min-h-[18px] text-caption">
              {groupPreview.state === 'idle' && (
                <span className="text-sail-gray-500">
                  코치에게 받은 5자리 코드가 있다면 입력하세요.
                </span>
              )}
              {groupPreview.state === 'invalid' && (
                <span className="text-sail-warning">{groupPreview.message}</span>
              )}
              {groupPreview.state === 'checking' && (
                <span className="text-sail-gray-500">확인 중…</span>
              )}
              {groupPreview.state === 'found' && (
                <span className="text-sail-success">
                  ✓ &lsquo;{groupPreview.name}&rsquo; 그룹에 결과를 보냅니다.
                </span>
              )}
              {groupPreview.state === 'not-found' && (
                <span className="text-sail-danger">{groupPreview.message}</span>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" fullWidth>
            진단 시작하기 →
          </Button>
        </form>

        <p className="mt-6 text-center text-caption text-sail-gray-500">
          개인을 식별할 수 있는 정보는 저장하지 않습니다.
          <br />
          응답 데이터는 진단 결과 생성과 통계 목적으로만 사용됩니다.
        </p>
      </div>
    </main>
  );
}
