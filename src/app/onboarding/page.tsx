/**
 * /onboarding — OAuth 가입자 프로필 보완 (Server Component)
 *
 * OAuth로 가입한 사용자의 phone 또는 full_name이 비어있으면
 * proxy.ts가 이 페이지로 강제 이동시킨다.
 */

import { redirect } from 'next/navigation';

import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { UserRow } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const auth = await getAuthContext();
  if (!auth) redirect('/login?redirect=/onboarding');

  const svc = createServiceRoleClient();
  const { data: user } = await svc
    .from('users')
    .select('*')
    .eq('id', auth.userId)
    .single<UserRow>();
  if (!user) redirect('/login');

  const { redirect: redirectTo } = await searchParams;
  const next = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/';

  // 이미 채워져 있으면 즉시 redirect
  if (user.full_name && user.phone) {
    redirect(next);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
            👋
          </div>
          <h1 className="text-h2 font-bold text-sail-gray-900">
            반갑습니다!
          </h1>
          <p className="mt-1 text-bodySm text-sail-gray-500">
            진단 결과를 개인별로 안내해드리기 위해
            <br />
            몇 가지 정보만 확인하겠습니다
          </p>
        </div>

        <OnboardingForm
          initialFullName={user.full_name}
          initialPhone={user.phone}
          redirectTo={next}
        />
      </div>
    </main>
  );
}
