'use client';

/**
 * /reset-password/confirm — 메일 링크에서 도착. 새 암호 입력.
 *
 * Supabase가 URL hash에 access_token, refresh_token, type=recovery 등을
 * 박아서 보낸다. 사이트가 로드되면 자동으로 세션이 설정되고,
 * supabase.auth.updateUser({ password }) 호출 시 비밀번호 변경됨.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [check, setCheck] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const supabase = createClient();

  // 세션이 들어왔는지 확인
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
            🔑
          </div>
          <h1 className="text-h2 font-bold text-sail-gray-900">새 암호 설정</h1>
          <p className="mt-1 text-bodySm text-sail-gray-500">
            새로 사용할 암호를 입력해주세요
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
            {error}
            <div className="mt-2">
              <Link
                href="/reset-password"
                className="font-semibold underline"
              >
                재설정 다시 요청 →
              </Link>
            </div>
          </div>
        )}

        {ready && !error && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
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
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
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
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
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
