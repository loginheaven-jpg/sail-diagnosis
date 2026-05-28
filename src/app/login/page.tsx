'use client';

/**
 * /login — 로그인 페이지
 *
 * 카카오 / 구글 OAuth + (어드민용) 이메일·비번
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function Fallback() {
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'kakao' | 'google' | 'email' | null>(null);
  const [showEmail, setShowEmail] = useState(false);

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
    // 성공 시 Supabase가 OAuth 공급자로 리다이렉트
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy('email');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setError(`로그인 실패: ${err.message}`);
      setBusy(null);
      return;
    }
    router.replace(redirect);
    router.refresh();
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
            그룹 진단·코치 기능을 사용하려면 로그인하세요
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* 카카오 */}
          <button
            type="button"
            onClick={() => startOAuth('kakao')}
            disabled={busy !== null}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-[#FEE500] px-5 text-body font-semibold text-[#191600] shadow-card transition hover:brightness-95 disabled:opacity-60"
          >
            {busy === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
          </button>

          {/* 구글 */}
          <button
            type="button"
            onClick={() => startOAuth('google')}
            disabled={busy !== null}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-button border border-sail-gray-300 bg-white px-5 text-body font-semibold text-sail-gray-800 shadow-card transition hover:bg-sail-gray-50 disabled:opacity-60"
          >
            {busy === 'google' ? '연결 중…' : '구글로 시작하기'}
          </button>

          {/* 이메일 토글 */}
          <button
            type="button"
            onClick={() => setShowEmail((s) => !s)}
            className="block w-full pt-2 text-center text-caption text-sail-gray-500 underline-offset-2 hover:text-sail-navy hover:underline"
          >
            {showEmail ? '이메일 로그인 닫기' : '이메일로 로그인 (관리자용)'}
          </button>

          {showEmail && (
            <form onSubmit={submitEmail} className="space-y-3 pt-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                placeholder="이메일"
                required
                autoComplete="email"
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder="비밀번호"
                required
                autoComplete="current-password"
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
              <Button type="submit" size="lg" fullWidth disabled={busy !== null}>
                {busy === 'email' ? '로그인 중…' : '로그인'}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-caption text-sail-gray-500">
          처음 방문하셨다면 카카오/구글 버튼 클릭만으로 가입 + 로그인이
          <br />
          동시에 이루어집니다. 별도 회원가입은 필요하지 않습니다.
        </p>
      </div>
    </main>
  );
}
