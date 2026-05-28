'use client';

/**
 * /reset-password — 암호 재설정 요청
 *
 * 이메일 입력 → Supabase Auth resetPasswordForEmail() 호출
 *   → Resend SMTP로 메일 발송
 *   → 사용자가 메일 링크 클릭하면 /reset-password/confirm 으로 이동 (토큰 포함)
 */

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

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
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
            📧
          </div>
          <h1 className="mb-2 text-h2 font-bold text-sail-gray-900">
            메일이 발송되었습니다
          </h1>
          <p className="mb-6 text-body text-sail-gray-600">
            <strong>{email}</strong> 로<br />
            암호 재설정 링크를 보냈습니다.
          </p>
          <div className="mb-6 rounded-card border border-sail-gray-200 bg-sail-gray-50 p-4 text-bodySm text-sail-gray-600">
            메일이 안 보인다면 스팸함을 확인해주세요.
          </div>
          <Link
            href="/login"
            className="text-bodySm font-semibold text-sail-navy hover:underline"
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
            🔑
          </div>
          <h1 className="text-h2 font-bold text-sail-gray-900">암호 재설정</h1>
          <p className="mt-1 text-bodySm text-sail-gray-500">
            가입 시 사용한 이메일을 입력하시면
            <br />
            재설정 링크를 보내드립니다
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
              이메일
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
          </div>
          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {busy ? '발송 중…' : '재설정 메일 보내기'}
          </Button>
        </form>

        <p className="mt-6 text-center text-caption text-sail-gray-500">
          <Link href="/login" className="hover:text-sail-navy hover:underline">
            ← 로그인 화면으로
          </Link>
        </p>
      </div>
    </main>
  );
}
