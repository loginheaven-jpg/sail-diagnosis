'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** A fragment secret never goes to a page request, server log, metadata or referrer. */
export function ShareTokenExchange({ resultId }: { resultId: string }) {
  const router = useRouter();
  const pending = useRef<Promise<boolean> | null>(null);
  const [state, setState] = useState<'checking' | 'unavailable'>('checking');

  useEffect(() => {
    if (!pending.current) {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const token = fragment.get('share');
      // Remove before any network operation; do not restore a failed token to the URL.
      if (window.location.hash) history.replaceState(null, '', window.location.pathname);
      pending.current = token && /^[A-Za-z0-9_-]{32,128}$/.test(token)
        ? fetch('/api/diagnosis/share/exchange', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            referrerPolicy: 'no-referrer',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resultId, token }),
          }).then(response => response.ok).catch(() => false)
        : Promise.resolve(false);
    }
    let current = true;
    void pending.current.then(ok => {
      if (!current) return;
      if (ok) router.refresh();
      else setState('unavailable');
    });
    return () => { current = false; };
  }, [resultId, router]);

  return <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
    <section className="rounded-modal border p-8" style={{ background: 'rgba(15,36,56,0.7)', borderColor: 'rgba(201,162,39,0.18)' }}>
      <h1 className="font-serif text-2xl text-sail-paper">{state === 'checking' ? '공유 권한을 확인하고 있습니다' : '이 결과를 열 수 없습니다'}</h1>
      <p className="mt-4 text-sm leading-7 text-sail-mist" role="status">{state === 'checking' ? '잠시만 기다려 주세요.' : '본인의 참여 세션이나 유효한 공유 링크가 필요합니다. 만료되거나 철회된 링크는 작성자에게 다시 요청해 주세요.'}</p>
      <Link href="/" className="mt-6 inline-block text-sm text-sail-gold">SAIL 홈으로</Link>
    </section>
  </main>;
}
