import { redirect } from 'next/navigation';

import TestClient from '@/components/test/TestClient';
import { getAuthContext } from '@/lib/supabase/auth';
import { normalizeGroupCode, GROUP_CODE_REGEX } from '@/types/sail';

export const dynamic = 'force-dynamic';

/** Beta policy B: authenticated users alone can access the questionnaire. */
export default async function TestPage({ searchParams }: { searchParams: Promise<{ group?: string | string[]; session?: string | string[] }> }) {
  const auth = await getAuthContext();
  if (!auth) {
    const params = await searchParams;
    const candidate = params.group ?? params.session;
    const group = typeof candidate === 'string' ? normalizeGroupCode(candidate) : '';
    const destination = GROUP_CODE_REGEX.test(group) ? `/test?group=${encodeURIComponent(group)}` : '/test';
    redirect(`/login?redirect=${encodeURIComponent(destination)}`);
  }
  return <TestClient />;
}
