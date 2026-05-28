'use client';

/**
 * IntroScreen — 진단 시작 화면
 *
 * - 닉네임 입력 (필수)
 * - 세션 코드 입력 (선택, URL ?session=XXX 로 사전 채워질 수 있음)
 * - 진단 시작 버튼
 */

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useTestStore } from '@/stores/test-store';

interface IntroScreenProps {
  prefilledSessionCode?: string | null;
}

export function IntroScreen({ prefilledSessionCode }: IntroScreenProps) {
  const setNickname = useTestStore((s) => s.setNickname);
  const setSessionCode = useTestStore((s) => s.setSessionCode);
  const startTest = useTestStore((s) => s.startTest);

  const [nickname, setNicknameLocal] = useState('');
  const [sessionCode, setSessionCodeLocal] = useState(prefilledSessionCode ?? '');
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setNickname(trimmed);
    setSessionCode(sessionCode.trim() || null);
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

        {/* 폼 */}
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
              htmlFor="session"
              className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800"
            >
              세미나 코드 <span className="font-normal text-sail-gray-500">(선택)</span>
            </label>
            <input
              id="session"
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCodeLocal(e.currentTarget.value)}
              placeholder="예: SAIL-260528"
              maxLength={40}
              autoComplete="off"
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body text-sail-gray-900 placeholder:text-sail-gray-400 focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
            <p className="mt-1 text-caption text-sail-gray-500">
              세미나·워크숍에서 받은 코드가 있다면 입력하세요.
            </p>
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
