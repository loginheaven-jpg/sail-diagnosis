/**
 * Header — 전역 헤더 (Server Component)
 *
 * - 로고
 * - 진단 / 디자인 시스템 메뉴
 * - 로그인 상태: 미로그인이면 로그인 버튼, 로그인 상태면 닉네임 + role 메뉴
 */

import Link from 'next/link';

import { getAuthContext } from '@/lib/supabase/auth';

export async function Header() {
  const auth = await getAuthContext();

  return (
    <header className="sticky top-0 z-50 border-b border-sail-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-sail-navy"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-md bg-sail-orange text-white"
          >
            ⛵
          </span>
          <span>SAIL</span>
        </Link>

        <nav className="hidden items-center gap-1 text-bodySm md:flex">
          <Link
            href="/test"
            className="rounded-md px-3 py-1.5 text-sail-gray-700 transition hover:bg-sail-gray-100 hover:text-sail-navy"
          >
            진단하기
          </Link>
          {auth && (auth.role === 'coach' || auth.role === 'admin') && (
            <Link
              href="/coach"
              className="rounded-md px-3 py-1.5 text-sail-gray-700 transition hover:bg-sail-gray-100 hover:text-sail-navy"
            >
              코치 대시보드
            </Link>
          )}
          {auth?.role === 'admin' && (
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 text-sail-gray-700 transition hover:bg-sail-gray-100 hover:text-sail-navy"
            >
              관리자
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 text-bodySm">
          {auth ? (
            <UserChip auth={auth} />
          ) : (
            <Link
              href="/login"
              className="rounded-button bg-sail-navy px-4 py-1.5 font-semibold text-white transition hover:bg-sail-navy-light"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function UserChip({
  auth,
}: {
  auth: { userId: string; role: 'user' | 'coach' | 'admin'; email: string | null };
}) {
  const roleLabel =
    auth.role === 'admin' ? '관리자' : auth.role === 'coach' ? '코치' : '멤버';
  const roleClass =
    auth.role === 'admin'
      ? 'bg-sail-orange text-white'
      : auth.role === 'coach'
        ? 'bg-sail-navy text-white'
        : 'bg-sail-gray-200 text-sail-gray-700';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-pill px-2.5 py-0.5 text-tiny font-semibold ${roleClass}`}
      >
        {roleLabel}
      </span>
      <span className="hidden text-sail-gray-700 sm:inline">
        {auth.email?.split('@')[0] ?? '사용자'}
      </span>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="rounded-md px-2 py-1 text-tiny text-sail-gray-500 transition hover:bg-sail-gray-100 hover:text-sail-danger"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
