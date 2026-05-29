'use client';

/**
 * /reset-password — 암호 재설정 요청 (Quiet Luxury v2.0)
 */

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
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

const ICON_BOX: React.CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0.06) 100%)',
  border: '1px solid rgba(201,162,39,0.35)',
  boxShadow: '0 0 24px rgba(201,162,39,0.3)',
};

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setBusy(true);
    const redirect =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password/confirm`
        : '/reset-password/confirm';

    const { error: err } = await supabase.auth.resetPasswordForEmail(em, {
      redirectTo: redirect,
    });

    if (err) {
      setError(`발송 실패: ${err.message}`);
      setBusy(false);
      return;
    }
    setSent(true);
    setBusy(false);
  };

  if (sent) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
            style={ICON_BOX}
          >
            📧
          </div>
          <p className="text-sail-gold" style={META_LABEL}>
            Email Sent
          </p>
          <h1
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(24px, 3vw, 30px)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            메일이 발송되었습니다
          </h1>
          <p
            className="mt-4 text-sail-mist"
            style={{ fontSize: 15, lineHeight: 1.75 }}
          >
            <strong className="text-sail-paper" style={{ fontWeight: 600 }}>
              {email}
            </strong>{' '}
            로
            <br />
            암호 재설정 링크를 보냈습니다.
          </p>
          <div
            className="mt-7 rounded-card border px-5 py-4 text-sail-mist"
            style={{
              background: 'rgba(10,22,40,0.5)',
              borderColor: 'rgba(232,237,242,0.08)',
              fontSize: 13,
              lineHeight: 1.7,
              textAlign: 'left',
            }}
          >
            메일이 안 보인다면 스팸함을 확인해주세요.
          </div>
          <Link
            href="/login"
            className="mt-7 inline-block text-sail-gold transition-colors duration-200 hover:text-sail-gold-soft"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              letterSpacing: '0.1em',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            로그인 화면으로 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
            style={ICON_BOX}
          >
            🔑
          </div>
          <p className="text-sail-gold" style={META_LABEL}>
            Reset Password
          </p>
          <h1
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 32px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
            }}
          >
            암호 재설정
          </h1>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.7 }}
          >
            가입 시 사용한 이메일을 입력하시면
            <br />
            재설정 링크를 보내드립니다
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

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              className="mb-2 block text-sail-paper"
              style={{
                fontFamily: 'var(--font-korean)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              이메일
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
          </div>
          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? '발송 중…' : '재설정 메일 보내기'}
          </Button>
        </form>

        <p className="mt-7 text-center">
          <Link
            href="/login"
            className="text-sail-mist transition-colors duration-200 hover:text-sail-gold"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              letterSpacing: '0.08em',
            }}
          >
            ← 로그인 화면으로
          </Link>
        </p>
      </div>
    </main>
  );
}
