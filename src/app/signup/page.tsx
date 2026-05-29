'use client';

/**
 * /signup — 신규 가입 (이름 + 전화번호 + 이메일 + 암호) (Quiet Luxury v2.0)
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { createClient } from '@/lib/supabase/client';

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

const INPUT_BASE: React.CSSProperties = {
  background: 'rgba(10,22,40,0.55)',
  borderColor: 'rgba(232,237,242,0.12)',
  color: 'var(--color-sail-paper)',
  fontFamily: 'var(--font-korean)',
  fontSize: 15,
  height: 48,
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-korean)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-sail-paper)',
};

const HINT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 12,
  letterSpacing: '0.05em',
  lineHeight: 1.6,
  color: 'rgba(169,187,208,0.7)',
};

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <p className="text-sail-mist">가입 화면을 불러오는 중…</p>
    </main>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledPhone = normalizePhone(searchParams.get('phone') ?? '');
  const redirect = searchParams.get('redirect') ?? '/';

  const [fullName, setFullName] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState(formatPhone(prefilledPhone));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [applyAsCoach, setApplyAsCoach] = useState(false);
  const [coachMotivation, setCoachMotivation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fn = fullName.trim();
    if (fn.length < 1 || fn.length > 50) {
      setError('이름은 1~50자 사이여야 합니다.');
      return;
    }
    const phone = normalizePhone(phoneDisplay);
    if (!isValidPhone(phone)) {
      setError('전화번호 형식이 올바르지 않습니다.');
      return;
    }
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (password.length < 8) {
      setError('암호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordCheck) {
      setError('암호가 일치하지 않습니다.');
      return;
    }
    if (!agreed) {
      setError('이용 약관에 동의해주세요.');
      return;
    }

    setBusy(true);

    try {
      const lookup = await fetch('/api/auth/phone-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const j = (await lookup.json()) as { exists?: boolean };
      if (j.exists) {
        setError('이미 가입된 전화번호입니다. 로그인 화면에서 시도해주세요.');
        setBusy(false);
        return;
      }
    } catch {
      /* lookup 실패는 무시하고 가입 시도 */
    }

    const callbackUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
        : '/auth/callback';
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: em,
      password,
      options: {
        emailRedirectTo: callbackUrl,
        data: { full_name: fn, phone },
      },
    });
    if (signUpErr) {
      setError(`가입 실패: ${signUpErr.message}`);
      setBusy(false);
      return;
    }

    if (signUpData.session) {
      try {
        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: fn, phone }),
        });
      } catch {
        /* ignore */
      }

      if (applyAsCoach) {
        try {
          await fetch('/api/coach-applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              motivation: coachMotivation.trim() || null,
            }),
          });
        } catch {
          /* ignore */
        }
        router.replace('/coach/apply');
        router.refresh();
        return;
      }

      router.replace(redirect);
      router.refresh();
      return;
    }

    setError(null);
    router.replace(
      `/signup/confirm?email=${encodeURIComponent(em)}&redirect=${encodeURIComponent(redirect)}`
    );
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0.06) 100%)',
              border: '1px solid rgba(201,162,39,0.35)',
              boxShadow: '0 0 24px rgba(201,162,39,0.3)',
            }}
          >
            ⛵
          </div>
          <p className="text-sail-gold" style={META_LABEL}>
            Sign Up
          </p>
          <h1
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
            }}
          >
            가입하기
          </h1>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.7 }}
          >
            이름·전화번호·이메일·암호를 입력하면 끝입니다
          </p>
        </div>

        {error && (
          <div
            className="mb-5 rounded-alert border-l-2 px-5 py-3"
            style={{
              background: 'rgba(248,113,113,0.08)',
              borderColor: 'var(--color-sail-danger)',
              color: 'var(--color-sail-paper)',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-2 block" style={LABEL_STYLE}>
              이름 <span className="text-sail-danger">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.currentTarget.value)}
              placeholder="홍길동"
              autoComplete="name"
              maxLength={50}
              required
              className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
              style={INPUT_BASE}
            />
          </div>

          <div>
            <label className="mb-2 block" style={LABEL_STYLE}>
              전화번호 <span className="text-sail-danger">*</span>
            </label>
            <input
              type="tel"
              value={phoneDisplay}
              onChange={(e) => {
                const n = normalizePhone(e.currentTarget.value);
                setPhoneDisplay(formatPhone(n));
              }}
              placeholder="010-1234-5678"
              autoComplete="tel"
              required
              className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
              style={INPUT_BASE}
            />
            <p className="mt-2" style={HINT_STYLE}>
              로그인 ID로 사용됩니다. 다른 사람과 중복될 수 없습니다.
            </p>
          </div>

          <div>
            <label className="mb-2 block" style={LABEL_STYLE}>
              이메일 <span className="text-sail-danger">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
              style={INPUT_BASE}
            />
            <p className="mt-2" style={HINT_STYLE}>
              암호 재설정·공지 수신용입니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block" style={LABEL_STYLE}>
                암호 <span className="text-sail-danger">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder="8자 이상"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
                style={INPUT_BASE}
              />
            </div>
            <div>
              <label className="mb-2 block" style={LABEL_STYLE}>
                암호 확인 <span className="text-sail-danger">*</span>
              </label>
              <input
                type="password"
                value={passwordCheck}
                onChange={(e) => setPasswordCheck(e.currentTarget.value)}
                placeholder="다시 입력"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
                style={INPUT_BASE}
              />
            </div>
          </div>

          {/* 코치 신청 옵션 */}
          <div
            className="rounded-card border p-5"
            style={{
              background: 'rgba(10,22,40,0.5)',
              borderColor: 'rgba(201,162,39,0.2)',
            }}
          >
            <label className="flex cursor-pointer items-start gap-3 text-sail-paper">
              <input
                type="checkbox"
                checked={applyAsCoach}
                onChange={(e) => setApplyAsCoach(e.currentTarget.checked)}
                className="mt-1 h-4 w-4 accent-sail-gold"
              />
              <span>
                <strong style={{ fontFamily: 'var(--font-korean)', fontSize: 14 }}>
                  코치로 가입 신청
                </strong>
                <span
                  className="ml-2 rounded-pill"
                  style={{
                    background: 'rgba(232,168,56,0.14)',
                    border: '1px solid rgba(232,168,56,0.4)',
                    color: 'var(--color-sail-warning)',
                    ...META_LABEL,
                    fontSize: 9,
                    padding: '3px 9px',
                  }}
                >
                  Review
                </span>
                <span
                  className="mt-2 block text-sail-mist"
                  style={{ fontSize: 13, lineHeight: 1.65 }}
                >
                  팀·조직·교회에서 그룹을 만들고 멤버들의 진단 결과를 관리하는 코치 권한을 신청합니다. 관리자가 검토 후 승인합니다.
                </span>
              </span>
            </label>
            {applyAsCoach && (
              <div className="mt-4 ml-7">
                <label
                  className="mb-2 block text-sail-paper"
                  style={{
                    fontFamily: 'var(--font-korean)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  신청 사유 (선택, 최대 500자)
                </label>
                <textarea
                  value={coachMotivation}
                  onChange={(e) => setCoachMotivation(e.currentTarget.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="어떤 목적으로 코치 권한이 필요한지 짧게 적어주시면 검토가 빨라집니다."
                  className="w-full rounded-input border px-3.5 py-2.5 focus:outline-none transition-colors duration-200"
                  style={{ ...INPUT_BASE, height: 'auto', fontSize: 13 }}
                />
              </div>
            )}
          </div>

          <label
            className="flex cursor-pointer items-start gap-3 text-sail-mist"
            style={{ fontSize: 13, lineHeight: 1.7 }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.currentTarget.checked)}
              className="mt-1 h-4 w-4 accent-sail-gold"
            />
            <span>
              개인 식별 가능 정보(이름·전화번호·이메일)는 진단 결과 제공과 통계 목적으로만 사용됩니다. 이에 동의합니다.
            </span>
          </label>

          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? '가입 중…' : '가입 완료'}
          </Button>
        </form>

        <p
          className="mt-7 text-center text-sail-mist"
          style={{ fontSize: 13, lineHeight: 1.7 }}
        >
          이미 가입하셨나요?{' '}
          <Link
            href="/login"
            className="text-sail-gold transition-colors duration-200 hover:text-sail-gold-soft"
            style={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            로그인 →
          </Link>
        </p>
      </div>
    </main>
  );
}
