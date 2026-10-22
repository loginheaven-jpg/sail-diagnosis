'use client';

/**
 * /login — 전화번호+암호 + OAuth (카카오/구글) (Quiet Luxury v2.0)
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { safeInternalRedirect } from '@/lib/auth-redirect';
import { formatPhone, normalizePhone } from '@/lib/phone';
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
      <p className="text-sail-mist">로그인 화면을 불러오는 중…</p>
    </main>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeInternalRedirect(searchParams.get('redirect'));
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

    try {
      const res = await fetch('/api/auth/phone-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ phone, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? '전화번호 또는 암호를 확인해 주세요.');
        setNeedReset(res.status === 401);
        setBusy(null);
        return;
      }
      setPassword('');
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
            Sign In
          </p>
          <h1
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
            }}
          >
            로그인
          </h1>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.7 }}
          >
            전화번호로 시작하거나 카카오·구글로 빠르게 들어가세요
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
            {needReset && (
              <Link
                href="/reset-password"
                className="ml-2 text-sail-gold"
                style={{ fontWeight: 600, textDecoration: 'underline' }}
              >
                암호 재설정 →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={submitPhone} className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-2 block" style={LABEL_STYLE}>
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
              className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
              style={INPUT_BASE}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block" style={LABEL_STYLE}>
              암호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="8자 이상"
              autoComplete="current-password"
              className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
              style={INPUT_BASE}
            />
          </div>
          <Button type="submit" size="lg" fullWidth disabled={busy !== null}>
            {busy === 'phone' ? '확인 중…' : '로그인'}
          </Button>
          <p
            className="text-center text-sail-mist/70"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              letterSpacing: '0.05em',
              lineHeight: 1.6,
            }}
          >
            처음 이용하신다면 아래 회원 가입을 선택해 주세요.
          </p>
        </form>

        <div
          className="my-7 flex items-center gap-3 text-sail-mist/60"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          <span
            className="h-px flex-1"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(232,237,242,0.2) 100%)',
            }}
          />
          OR
          <span
            className="h-px flex-1"
            style={{
              background:
                'linear-gradient(90deg, rgba(232,237,242,0.2) 0%, transparent 100%)',
            }}
          />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => startOAuth('kakao')}
            disabled={busy !== null}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-btn transition-all duration-200 hover:-translate-y-[1px] disabled:opacity-60"
            style={{
              background: '#FEE500',
              color: '#191600',
              fontFamily: 'var(--font-korean)',
              fontSize: 15,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(254,229,0,0.2)',
            }}
          >
            {busy === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
          </button>
          <button
            type="button"
            onClick={() => startOAuth('google')}
            disabled={busy !== null}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-btn transition-all duration-200 hover:-translate-y-[1px] disabled:opacity-60"
            style={{
              background: 'rgba(244,239,230,0.95)',
              color: '#1A2E40',
              fontFamily: 'var(--font-korean)',
              fontSize: 15,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              border: '1px solid rgba(232,237,242,0.2)',
            }}
          >
            {busy === 'google' ? '연결 중…' : '구글로 시작하기'}
          </button>
        </div>

        <div
          className="mt-8 space-y-3 text-center text-sail-mist"
          style={{ fontSize: 13, lineHeight: 1.7 }}
        >
          <div>
            <Link
              href="/reset-password"
              className="text-sail-mist transition-colors duration-200 hover:text-sail-gold"
              style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              암호를 잊으셨나요?
            </Link>
          </div>
          <div className="text-sail-mist/70" style={{ fontSize: 12 }}>
            <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-sail-gold underline">회원 가입</Link><br />카카오/구글로 시작해도 됩니다.
          </div>
        </div>
      </div>
    </main>
  );
}
