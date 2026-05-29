'use client';

/**
 * /reset-password/confirm — 메일 링크에서 도착. 새 암호 입력 (Quiet Luxury v2.0)
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-korean)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-sail-paper)',
};

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [check, setCheck] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: err } = await supabase.auth.getSession();
      if (cancelled) return;
      if (err || !data.session) {
        setError('재설정 링크가 유효하지 않거나 만료되었습니다.');
      } else {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('암호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== check) {
      setError('암호가 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(`암호 변경 실패: ${err.message}`);
      setBusy(false);
      return;
    }
    router.replace('/?reset=ok');
    router.refresh();
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
            🔑
          </div>
          <p className="text-sail-gold" style={META_LABEL}>
            New Password
          </p>
          <h1
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 32px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
            }}
          >
            새 암호 설정
          </h1>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.7 }}
          >
            새로 사용할 암호를 입력해주세요
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
            <div className="mt-2">
              <Link
                href="/reset-password"
                className="text-sail-gold"
                style={{ fontWeight: 600, textDecoration: 'underline' }}
              >
                재설정 다시 요청 →
              </Link>
            </div>
          </div>
        )}

        {ready && !error && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-2 block" style={LABEL_STYLE}>
                새 암호
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
                새 암호 확인
              </label>
              <input
                type="password"
                value={check}
                onChange={(e) => setCheck(e.currentTarget.value)}
                placeholder="다시 입력"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full rounded-input border px-4 focus:outline-none transition-colors duration-200"
                style={INPUT_BASE}
              />
            </div>
            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? '저장 중…' : '암호 변경'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
