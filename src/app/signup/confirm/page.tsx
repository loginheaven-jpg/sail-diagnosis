/**
 * /signup/confirm — 가입 후 이메일 확인 안내 (Quiet Luxury v2.0)
 */

import Link from 'next/link';
import { safeInternalRedirect } from '@/lib/auth-redirect';

export const metadata = {
  title: '이메일을 확인해주세요 · SAIL',
};

interface PageProps {
  searchParams: Promise<{ email?: string; redirect?: string }>;
}

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export default async function ConfirmPage({ searchParams }: PageProps) {
  const { email, redirect } = await searchParams;
  const destination = safeInternalRedirect(redirect);
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0.06) 100%)',
            border: '1px solid rgba(201,162,39,0.35)',
            boxShadow: '0 0 24px rgba(201,162,39,0.3)',
          }}
        >
          📧
        </div>
        <p className="text-sail-gold" style={META_LABEL}>
          Verify Email
        </p>
        <h1
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(24px, 3vw, 30px)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
          }}
        >
          이메일을 확인해주세요
        </h1>
        <p
          className="mt-4 text-sail-mist"
          style={{ fontSize: 15, lineHeight: 1.75 }}
        >
          {email ? (
            <strong className="text-sail-paper" style={{ fontWeight: 600 }}>
              {email}
            </strong>
          ) : (
            '입력하신 이메일'
          )}{' '}
          로 확인 메일을 보냈습니다.
          <br />
          메일의 링크를 클릭하면 로그인이 완료됩니다.
        </p>
        <div
          className="mt-7 rounded-card border px-5 py-4 text-sail-mist"
          style={{
            background: 'rgba(10,22,40,0.5)',
            borderColor: 'rgba(232,237,242,0.08)',
            fontSize: 13,
            lineHeight: 1.7,
            textAlign: 'left',
          }}
        >
          메일이 안 보인다면 스팸함을 확인해주세요. 발신자는{' '}
          <code
            className="rounded px-1.5 py-0.5"
            style={{
              background: 'rgba(201,162,39,0.12)',
              color: 'var(--color-sail-gold)',
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            onboarding@resend.dev
          </code>{' '}
          입니다.
        </div>
        <Link
          href={`/login?redirect=${encodeURIComponent(destination)}`}
          className="mt-7 inline-block text-sail-gold transition-colors duration-200 hover:text-sail-gold-soft"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            letterSpacing: '0.1em',
            fontWeight: 600,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          로그인 화면으로 →
        </Link>
      </div>
    </main>
  );
}
