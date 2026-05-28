'use client';

/**
 * /login — 전화번호+암호 + OAuth (카카오/구글)
 *
 * 흐름:
 *   1. 사용자가 전화번호 + 암호 입력 후 "로그인" 클릭
 *   2. POST /api/auth/phone-lookup → exists 판단
 *      - exists=false: /signup 으로 redirect (전화번호 prefilled)
 *      - exists=true: 응답의 email로 supabase.auth.signInWithPassword 시도
 *        - 성공: redirect로 이동
 *        - 실패: "암호가 일치하지 않습니다 — 암호 재설정" 안내
 *   3. 카카오/구글 버튼은 즉시 OAuth signInWithOAuth
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <p className="text-sail-gray-500">로그인 화면을 불러오는 중…</p>
    </main>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const initialError = searchParams.get('error');

  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState<'phone' | 'kakao' | 'google' | null>(null);
  const [needReset, setNeedReset] = useState(false);

  const supabase = createClient();

  const oauthCallback =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      : '/auth/callback';

  const startOAuth = async (provider: 'kakao' | 'google') => {
    setError(null);
    setBusy(provider);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: oauthCallback },
    });
    if (err) {
      setError(`${provider} 로그인 실패: ${err.message}`);
      setBusy(null);
    }
  };

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedReset(false);
    setBusy('phone');

    const phone = normalizePhone(phoneDisplay);
    if (phone.length < 8) {
      setError('전화번호를 정확히 입력해주세요.');
      setBusy(null);
      return;
    }
    if (password.length === 0) {
      setError('암호를 입력해주세요.');
      setBusy(null);
      return;
    }

    // 1) phone-lookup
    try {
      const res = await fetch('/api/auth/phone-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const json = (await res.json()) as {
        exists?: boolean;
        email?: string;
        phone?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? '조회 실패');
        setBusy(null);
        return;
      }

      if (!json.exists) {
        // 미가입 → 가입 페이지로 이동
        router.push(
          `/signup?phone=${encodeURIComponent(phone)}&redirect=${encodeURIComponent(redirect)}`
        );
        return;
      }

      // 2) password로 로그인 시도
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: json.email!,
        password,
      });
      if (signInErr) {
        setError('암호가 일치하지 않습니다.');
        setNeedReset(true);
        setBusy(null);
        return;
      }
      // 3) 역할 기반 라우팅 — 명시적 redirect가 있으면 그곳, 없으면 role에 따라
      if (redirect && redirect !== '/') {
        router.replace(redirect);
      } else {
        try {
          const me = await fetch('/api/users/me');
          const meJson = (await me.json()) as { user?: { role?: string } };
          const role = meJson.user?.role ?? 'user';
          if (role === 'admin') router.replace('/admin');
          else if (role === 'coach') router.replace('/coach');
          else router.replace('/');
        } catch {
          router.replace('/');
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
            ⛵
          </div>
          <h1 className="text-h2 font-bold text-sail-gray-900">로그인</h1>
          <p className="mt-1 text-bodySm text-sail-gray-500">
            전화번호로 시작하거나 카카오·구글로 빠르게 들어가세요
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
            {error}
            {needReset && (
              <Link
                href="/reset-password"
                className="ml-2 font-semibold underline"
              >
                암호 재설정 →
              </Link>
            )}
          </div>
        )}

        {/* 전화번호 + 암호 폼 */}
        <form onSubmit={submitPhone} className="space-y-3">
          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800"
            >
              전화번호
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneDisplay}
              onChange={(e) => {
                const n = normalizePhone(e.currentTarget.value);
                setPhoneDisplay(formatPhone(n));
              }}
              placeholder="010-1234-5678"
              autoComplete="tel"
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800"
            >
              암호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="8자 이상"
              autoComplete="current-password"
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
          </div>
          <Button type="submit" size="lg" fullWidth disabled={busy !== null}>
            {busy === 'phone' ? '확인 중…' : '로그인 / 가입 시작'}
          </Button>
          <p className="text-center text-caption text-sail-gray-500">
            가입돼 있지 않으면 자동으로 가입 화면으로 이동합니다
          </p>
        </form>

        <div className="my-6 flex items-center gap-3 text-caption text-sail-gray-400">
          <span className="h-px flex-1 bg-sail-gray-200" />
          또는
          <span className="h-px flex-1 bg-sail-gray-200" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => startOAuth('kakao')}
            disabled={busy !== null}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-[#FEE500] px-5 text-body font-semibold text-[#191600] shadow-card transition hover:brightness-95 disabled:opacity-60"
          >
            {busy === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
          </button>
          <button
            type="button"
            onClick={() => startOAuth('google')}
            disabled={busy !== null}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-button border border-sail-gray-300 bg-white px-5 text-body font-semibold text-sail-gray-800 shadow-card transition hover:bg-sail-gray-50 disabled:opacity-60"
          >
            {busy === 'google' ? '연결 중…' : '구글로 시작하기'}
          </button>
        </div>

        <div className="mt-8 space-y-2 text-center text-caption text-sail-gray-500">
          <div>
            <Link
              href="/reset-password"
              className="text-sail-gray-600 underline-offset-2 hover:text-sail-navy hover:underline"
            >
              암호를 잊으셨나요?
            </Link>
          </div>
          <div>
            처음이시면 위에서 바로 전화번호·암호를 입력하세요. <br />
            카카오/구글로 시작해도 됩니다.
          </div>
        </div>
      </div>
    </main>
  );
}
