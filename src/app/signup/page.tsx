'use client';

/**
 * /signup — 신규 가입 (이름 + 전화번호 + 이메일 + 암호)
 *
 * Supabase Auth (email+password)로 가입한 뒤, public.users의 phone/full_name을
 * /api/users/me PATCH로 채운다. 트리거가 ON CONFLICT DO UPDATE로 처리하므로
 * 순서는 가입 → 트리거 → API PATCH.
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { createClient } from '@/lib/supabase/client';

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
      <p className="text-sail-gray-500">가입 화면을 불러오는 중…</p>
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

    // 0) phone 중복 사전 체크 (DB에 unique 제약 있어 어차피 막히지만 UX 위해)
    try {
      const lookup = await fetch('/api/auth/phone-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const j = (await lookup.json()) as { exists?: boolean };
      if (j.exists) {
        setError(
          '이미 가입된 전화번호입니다. 로그인 화면에서 시도해주세요.'
        );
        setBusy(false);
        return;
      }
    } catch {
      /* lookup 실패는 무시하고 가입 시도 */
    }

    // 1) Supabase Auth 가입 (email+password)
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

    // 2) 트리거가 public.users 행 생성 + raw_user_meta_data에서 phone/full_name도 흡수.
    //    그래도 안전을 위해 클라이언트에서 PATCH로 한 번 더 동기화.
    if (signUpData.session) {
      // 세션이 즉시 발급된 경우 (email confirmation 비활성 시): PATCH 가능
      try {
        await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: fn, phone }),
        });
      } catch {
        /* ignore */
      }
      router.replace(redirect);
      router.refresh();
      return;
    }

    // 세션이 없는 경우 — 이메일 확인 메일이 보내진 상태
    setError(null);
    router.replace(
      `/signup/confirm?email=${encodeURIComponent(em)}&redirect=${encodeURIComponent(redirect)}`
    );
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
            ⛵
          </div>
          <h1 className="text-h2 font-bold text-sail-gray-900">가입하기</h1>
          <p className="mt-1 text-bodySm text-sail-gray-500">
            이름·전화번호·이메일·암호를 입력하면 끝입니다
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
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
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
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
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
            <p className="mt-1 text-caption text-sail-gray-500">
              로그인 ID로 사용됩니다. 다른 사람과 중복될 수 없습니다.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
              이메일 <span className="text-sail-danger">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
            <p className="mt-1 text-caption text-sail-gray-500">
              암호 재설정·공지 수신용입니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
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
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
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
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-bodySm text-sail-gray-700">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.currentTarget.checked)}
              className="mt-0.5 h-4 w-4 rounded border-sail-gray-300 text-sail-navy focus:ring-sail-navy"
            />
            <span>
              개인 식별 가능 정보(이름·전화번호·이메일)는 진단 결과 제공과 통계
              목적으로만 사용됩니다. 이에 동의합니다.
            </span>
          </label>

          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? '가입 중…' : '가입 완료'}
          </Button>
        </form>

        <p className="mt-6 text-center text-caption text-sail-gray-500">
          이미 가입하셨나요?{' '}
          <Link href="/login" className="font-semibold text-sail-navy hover:underline">
            로그인 →
          </Link>
        </p>
      </div>
    </main>
  );
}
