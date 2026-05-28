/**
 * /signup/confirm — 가입 후 이메일 확인 안내
 */

import Link from 'next/link';

export const metadata = {
  title: '이메일을 확인해주세요 · SAIL',
};

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function ConfirmPage({ searchParams }: PageProps) {
  const { email } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sail-orange text-3xl text-white shadow-card">
          📧
        </div>
        <h1 className="mb-2 text-h2 font-bold text-sail-gray-900">
          이메일을 확인해주세요
        </h1>
        <p className="mb-6 text-body text-sail-gray-600">
          {email ? <strong>{email}</strong> : '입력하신 이메일'} 로 확인 메일을 보냈습니다.
          <br />
          메일의 링크를 클릭하면 로그인이 완료됩니다.
        </p>
        <div className="rounded-card border border-sail-gray-200 bg-sail-gray-50 p-4 text-bodySm text-sail-gray-600">
          메일이 안 보인다면 스팸함을 확인해주세요. 발신자는{' '}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-caption">
            onboarding@resend.dev
          </code>{' '}
          입니다.
        </div>
        <Link
          href="/login"
          className="mt-6 inline-block text-bodySm font-semibold text-sail-navy hover:underline"
        >
          로그인 화면으로 →
        </Link>
      </div>
    </main>
  );
}
