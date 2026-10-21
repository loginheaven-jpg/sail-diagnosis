'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

import { useTestStore } from '@/stores/test-store';

/** A nonsecret server marker clears old drafts after successful Auth transitions. */
export function TestProgressBoundary() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (!document.cookie.split(';').some(value => value.trim() === 'sail_clear_progress=1')) return;
    useTestStore.getState().reset();
    document.cookie = 'sail_clear_progress=; Path=/; Max-Age=0; SameSite=Lax';
  }, [pathname]);
  return null;
}
