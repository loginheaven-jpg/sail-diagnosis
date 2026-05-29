'use client';

/**
 * IntroScreen — 진단 시작 화면 (v2.0 Quiet Luxury 다크 테마)
 *
 * - 닉네임 입력 (필수)
 * - 그룹 코드 입력 (5자리, 선택). URL ?group=XXXXX 로 사전 채워질 수 있음
 *   → 실시간 그룹명 미리보기 (코드 입력 완료 시 API로 검증)
 * - 진단 시작 버튼
 */

import { useEffect, useRef, useState } from 'react';

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

const DARK_CARD_BG =
  'linear-gradient(180deg, rgba(15,36,56,0.6), rgba(10,22,40,0.6))';

const INPUT_BASE =
  'h-12 w-full rounded-btn border bg-transparent px-4 text-body text-sail-paper placeholder:text-sail-mist/45 transition focus:outline-none focus:ring-0';

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
        message: `${GROUP_CODE_LENGTH}자리 영숫자 (혼동 글자 0/O/1/I/L 제외)`,
      });
      return;
    }
    setGroupPreview({ state: 'checking' });
    lastCheckRef.current = code;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/groups/lookup?code=${encodeURIComponent(code)}`,
          { cache: 'no-store' }
        );
        if (lastCheckRef.current !== code) return;
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
    <main className="relative mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-center px-[clamp(22px,4vw,32px)] py-16 md:py-20">
      <div className="w-full max-w-xl">
        {/* 헤더 */}
        <div className="mb-10 text-center">
          <div
            className="rise-1 font-serif italic text-sail-gold"
            style={{ fontSize: 16, letterSpacing: '0.1em', marginBottom: 20 }}
          >
            Begin Your Voyage
          </div>
          <h1
            className="rise-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(34px, 5vw, 44px)',
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: '-0.005em',
            }}
          >
            SAIL 소통 스타일 진단
          </h1>
          <p className="rise-3 mt-3 text-sail-mist" style={{ fontSize: 14, letterSpacing: '0.08em' }}>
            7~9분 · 30문항
          </p>
        </div>

        {/* 안내 카드 — 다크 톤 */}
        <div
          className="rise-4 mb-10 rounded-card border border-sail-mist/12 p-8"
          style={{ background: DARK_CARD_BG }}
        >
          <div
            className="mb-5 font-serif text-sail-gold-soft"
            style={{ fontSize: 13, letterSpacing: '0.28em', fontWeight: 600 }}
          >
            진단 안내
          </div>
          <ul className="space-y-3 text-sail-paper/90" style={{ fontSize: 15, lineHeight: 1.75 }}>
            <li className="flex gap-3">
              <span className="text-sail-gold-soft" style={{ marginTop: 2 }}>
                ✦
              </span>
              <span>
                총 30문항을 3단계로 응답합니다 — 상황 판단 · 가치 선택 · 성향 스펙트럼
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-sail-gold-soft" style={{ marginTop: 2 }}>
                ✦
              </span>
              <span>
                정답은 없습니다. <strong className="text-sail-paper">직관적으로</strong> 가장 가까운 응답을 선택하세요
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-sail-gold-soft" style={{ marginTop: 2 }}>
                ✦
              </span>
              <span>완료 후 4유형(S/A/I/L) 중 자신의 주 스타일과 항해 프로필을 받습니다</span>
            </li>
          </ul>
        </div>

        {/* 폼 */}
        <form onSubmit={handleStart} className="rise-5 space-y-6">
          <div>
            <label
              htmlFor="nickname"
              className="mb-2 block font-serif text-sail-gold-soft"
              style={{ fontSize: 12, letterSpacing: '0.22em', fontWeight: 600 }}
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
              className={INPUT_BASE}
              style={{
                borderColor: 'rgba(169,187,208,0.22)',
                fontFamily: 'var(--font-korean)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(224,201,119,0.6)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(169,187,208,0.22)';
              }}
            />
            <p
              className="mt-2 text-sail-mist/70"
              style={{ fontSize: 12, letterSpacing: '0.02em' }}
            >
              최대 20자. 본명일 필요 없습니다.
            </p>
          </div>

          <div>
            <label
              htmlFor="group"
              className="mb-2 block font-serif text-sail-gold-soft"
              style={{ fontSize: 12, letterSpacing: '0.22em', fontWeight: 600 }}
            >
              그룹 코드{' '}
              <span className="text-sail-mist/60" style={{ fontStyle: 'italic' }}>
                (선택)
              </span>
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
              placeholder="예: ABCD7"
              maxLength={GROUP_CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`${INPUT_BASE} font-mono uppercase`}
              style={{
                borderColor: 'rgba(169,187,208,0.22)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.25em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(224,201,119,0.6)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(169,187,208,0.22)';
              }}
            />
            <div className="mt-2 min-h-[18px]" style={{ fontSize: 12 }}>
              {groupPreview.state === 'idle' && (
                <span className="text-sail-mist/70">
                  코드를 비워두면 결과는 관리자의 일반 그룹에 자동 귀속됩니다.
                </span>
              )}
              {groupPreview.state === 'invalid' && (
                <span className="text-sail-warning">{groupPreview.message}</span>
              )}
              {groupPreview.state === 'checking' && (
                <span className="text-sail-mist/70">확인 중…</span>
              )}
              {groupPreview.state === 'found' && (
                <span className="text-sail-success">
                  ✦ &lsquo;{groupPreview.name}&rsquo; 그룹에 결과를 보냅니다.
                </span>
              )}
              {groupPreview.state === 'not-found' && (
                <span className="text-sail-danger">{groupPreview.message}</span>
              )}
            </div>
          </div>

          {error && (
            <div
              className="rounded-btn border-l-2 border-sail-danger px-4 py-3 text-sail-paper"
              style={{
                background: 'rgba(248,113,113,0.08)',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-2 inline-flex w-full items-center justify-center rounded-btn transition-all duration-300 hover:-translate-y-[2px]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
              color: '#0A1628',
              fontWeight: 700,
              padding: '16px 34px',
              fontSize: 15,
              letterSpacing: '0.04em',
              boxShadow: 'var(--shadow-gold)',
              fontFamily: 'var(--font-korean)',
            }}
          >
            진단 시작하기
          </button>
        </form>

        <p
          className="rise-6 mt-10 text-center text-sail-mist/60"
          style={{ fontSize: 12, letterSpacing: '0.04em', lineHeight: 1.8 }}
        >
          개인을 식별할 수 있는 정보는 저장하지 않습니다.
          <br />
          응답 데이터는 진단 결과 생성과 통계 목적으로만 사용됩니다.
        </p>
      </div>
    </main>
  );
}
