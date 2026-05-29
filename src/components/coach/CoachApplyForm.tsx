'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

export function CoachApplyForm() {
  const router = useRouter();
  const [motivation, setMotivation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/coach-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivation: motivation.trim() || null }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? '신청 실패');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-modal border p-7 md:p-9"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
        borderColor: 'rgba(169,187,208,0.12)',
      }}
    >
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
          <span style={{ color: 'var(--color-sail-danger)', fontWeight: 600 }}>
            ⚠ 오류
          </span>{' '}
          — {error}
        </div>
      )}

      <label
        className="mb-2 block text-sail-paper"
        style={{
          fontFamily: 'var(--font-korean)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        신청 사유 <span className="text-sail-mist/70">(선택)</span>
      </label>
      <textarea
        value={motivation}
        onChange={(e) => setMotivation(e.currentTarget.value)}
        maxLength={500}
        rows={5}
        placeholder="어떤 목적으로 코치 권한이 필요하신지 짧게 적어주시면 검토가 빨라집니다."
        className="w-full rounded-input border px-4 py-3 focus:outline-none transition-colors duration-200"
        style={{
          background: 'rgba(10,22,40,0.55)',
          borderColor: 'rgba(232,237,242,0.12)',
          color: 'var(--color-sail-paper)',
          fontFamily: 'var(--font-korean)',
          fontSize: 15,
          lineHeight: 1.7,
        }}
      />
      <p
        className="mt-2 mb-5 text-sail-mist/70"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          letterSpacing: '0.05em',
        }}
      >
        최대 500자
      </p>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? '제출 중…' : '신청 제출'}
      </Button>
    </form>
  );
}
