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
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div
          className="rounded-alert border-l-2 px-5 py-3"
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
          이후 전화번호로 로그인할 수 있습니다.
        </p>
      </div>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? '저장 중…' : '저장하고 계속하기'}
      </Button>
    </form>
  );
}
