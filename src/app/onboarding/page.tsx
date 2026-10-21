/**
 * /onboarding — OAuth 가입자 프로필 보완 (Quiet Luxury v2.0)
 */

import { redirect } from 'next/navigation';
import { safeInternalRedirect } from '@/lib/auth-redirect';

import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { toUserProfile } from '@/lib/user-profile';
import type { UserRow } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const auth = await getAuthContext();
  if (!auth) redirect('/login?redirect=/onboarding');

  const svc = createServiceRoleClient();
  const { data: row } = await svc
    .from('users')
    .select('*')
    .eq('id', auth.userId)
    .single<UserRow>();
  if (!row) redirect('/login');
  const user = toUserProfile(row);

  const { redirect: redirectTo } = await searchParams;
  const next = safeInternalRedirect(redirectTo);

  if (user.full_name && user.phone) {
    redirect(next);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0.06) 100%)',
              border: '1px solid rgba(201,162,39,0.35)',
              boxShadow: '0 0 24px rgba(201,162,39,0.3)',
            }}
          >
            👋
          </div>
          <p className="text-sail-gold" style={META_LABEL}>
            Welcome Aboard
          </p>
          <h1
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
            }}
          >
            반갑습니다
          </h1>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.75 }}
          >
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
