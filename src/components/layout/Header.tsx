/**
 * Header — v2.0 Quiet Luxury
 *
 * 디자인: 시안 sail_landing_final.html의 header를 React 컴포넌트화
 * - 좌측: 컴퍼스 SVG 아이콘 + SAIL 브랜드 마크 (Cormorant 600, 골드 소프트, ls 0.3em)
 * - 우측: 멤버는 진단 시작 CTA (테두리 골드), 로그인 상태면 역할 chip + 닉네임
 */

import Link from 'next/link';

import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function Header() {
  const auth = await getAuthContext();

  let displayName: string | null = null;
  if (auth) {
    const svc = createServiceRoleClient();
    const { data } = await svc
      .from('users')
      .select('full_name, nickname')
      .eq('id', auth.userId)
      .single<{ full_name: string | null; nickname: string | null }>();
    displayName =
      data?.full_name ?? data?.nickname ?? auth.email?.split('@')[0] ?? null;
  }

  return (
    <header
      className="relative z-50 mx-auto flex w-full max-w-[1180px] items-center justify-between px-8 py-8 md:px-8"
      style={{ paddingLeft: 'clamp(22px, 4vw, 32px)', paddingRight: 'clamp(22px, 4vw, 32px)' }}
    >
      <Link href="/" className="flex items-center gap-3">
        <CompassMark />
        <span
          className="font-serif text-sail-gold-soft"
          style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '0.3em' }}
        >
          SAIL
        </span>
      </Link>

      <nav className="flex items-center gap-6 md:gap-9 text-bodySm">
        <Link
          href="/guide"
          className="hidden text-sail-mist transition hover:text-sail-gold-soft md:inline"
          style={{ letterSpacing: '0.05em' }}
        >
          유형 가이드
        </Link>

        {auth && (auth.role === 'coach' || auth.role === 'admin') && (
          <Link
            href="/coach"
            className="hidden text-sail-mist transition hover:text-sail-gold-soft md:inline"
            style={{ letterSpacing: '0.05em' }}
          >
            코치 대시보드
          </Link>
        )}
        {/*
          관리자 메뉴는 노출하지 않는다.
          슈퍼어드민(loginheaven@gmail.com)은 1명뿐이고, 본인이 직접 /admin 으로
          진입한다 (URL 직접 또는 코치 대시보드의 별도 진입). 일반 코치/멤버에게
          "관리자"가 보이는 것은 혼란만 준다.
        */}

        {auth ? (
          <UserChip auth={auth} displayName={displayName} />
        ) : (
          <Link
            href="/login"
            className="rounded-btn border border-sail-gold/40 px-5 py-2.5 text-sail-gold-soft transition hover:bg-sail-gold/10"
            style={{ letterSpacing: '0.05em' }}
          >
            진단 시작
          </Link>
        )}
      </nav>
    </header>
  );
}

function CompassMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={26}
      height={26}
      fill="none"
      stroke="#E0C977"
      strokeWidth={1.2}
      className="opacity-90"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12,5 14,12 12,19 10,12" fill="#C9A227" stroke="none" />
      <polygon points="5,12 12,10 19,12 12,14" fill="rgba(127,212,208,.5)" stroke="none" />
    </svg>
  );
}

function UserChip({
  auth,
  displayName,
}: {
  auth: {
    userId: string;
    role: 'user' | 'coach' | 'admin';
    email: string | null;
  };
  displayName: string | null;
}) {
  // admin도 외부에서는 코치로 표시 (관리자는 본인만 알아서 식별)
  const roleLabel =
    auth.role === 'admin' || auth.role === 'coach' ? '코치' : '멤버';
  const roleClass =
    auth.role === 'admin' || auth.role === 'coach'
      ? 'bg-sail-navy text-sail-paper border border-sail-gold-soft/40'
      : 'bg-transparent border border-sail-mist/30 text-sail-mist';

  return (
    <div className="flex items-center gap-3">
      <span
        className={`rounded-pill px-3 py-1 text-tiny font-semibold ${roleClass}`}
        style={{ fontSize: '11px', letterSpacing: '0.18em', fontFamily: 'var(--font-serif)' }}
      >
        {roleLabel}
      </span>
      <span className="hidden text-sail-mist sm:inline" style={{ letterSpacing: '0.03em' }}>
        {displayName ?? '사용자'}
      </span>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="rounded-btn px-2 py-1 text-tiny text-sail-mist transition hover:text-sail-danger"
          style={{ fontSize: '11px', letterSpacing: '0.1em' }}
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
