'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';

interface Props {
  initialFullName: string | null;
  initialPhone: string | null;
  redirectTo: string;
}

export function OnboardingForm({
  initialFullName,
  initialPhone,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName ?? '');
  const [phoneDisplay, setPhoneDisplay] = useState(
    initialPhone ? formatPhone(initialPhone) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

    setBusy(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fn, phone }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? '저장 실패');
        setBusy(false);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
          {error}
        </div>
      )}

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
          이후 전화번호로 로그인할 수 있습니다.
        </p>
      </div>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? '저장 중…' : '저장하고 계속하기'}
      </Button>
    </form>
  );
}
