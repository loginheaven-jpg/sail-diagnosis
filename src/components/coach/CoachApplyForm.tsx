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
      className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card"
    >
      {error && (
        <div className="mb-4 rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
          {error}
        </div>
      )}

      <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
        신청 사유 <span className="font-normal text-sail-gray-500">(선택)</span>
      </label>
      <textarea
        value={motivation}
        onChange={(e) => setMotivation(e.currentTarget.value)}
        maxLength={500}
        rows={4}
        placeholder="어떤 목적으로 코치 권한이 필요하신지 짧게 적어주시면 검토가 빨라집니다."
        className="w-full rounded-input border border-sail-gray-300 px-3.5 py-2.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
      />
      <p className="mt-1 mb-4 text-caption text-sail-gray-500">최대 500자</p>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? '제출 중…' : '신청 제출'}
      </Button>
    </form>
  );
}
