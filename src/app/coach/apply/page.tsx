/**
 * /coach/apply — 코치 권한 자기등록 신청 (Quiet Luxury v2.0)
 *
 * - 로그인 사용자(role=user)만 신청 가능
 * - 이미 코치/관리자면 안내
 * - 본인의 이전 신청 이력 표시
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CoachApplyForm } from '@/components/coach/CoachApplyForm';
import { getAuthContext } from '@/lib/supabase/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { CoachApplicationRow } from '@/types/database';

export const dynamic = 'force-dynamic';

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

const SECTION_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
  borderColor: 'rgba(169,187,208,0.12)',
};

export default async function CoachApplyPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login?redirect=/coach/apply');

  if (auth.role === 'coach' || auth.role === 'admin') {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
        <div
          className="rounded-modal border p-9 text-center"
          style={SECTION_STYLE}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-2xl"
            style={{
              background: 'rgba(74,222,128,0.15)',
              border: '1px solid rgba(74,222,128,0.4)',
              color: 'var(--color-sail-success)',
              boxShadow: '0 0 24px rgba(74,222,128,0.25)',
            }}
          >
            ✓
          </div>
          <p className="text-sail-gold" style={META_LABEL}>
            Already Granted
          </p>
          <h1
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(22px, 2.8vw, 28px)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            이미 {auth.role === 'admin' ? '관리자' : '코치'} 권한이 있어요
          </h1>
          <p
            className="mt-3 text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.7 }}
          >
            추가 신청은 필요하지 않습니다.
          </p>
          <Link
            href="/coach"
            className="mt-7 inline-flex items-center rounded-btn transition-all duration-300 hover:-translate-y-[1px]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-sail-gold) 0%, var(--color-sail-gold-soft) 100%)',
              color: '#0A1628',
              fontWeight: 700,
              padding: '13px 26px',
              fontSize: 14,
              letterSpacing: '0.04em',
              boxShadow: 'var(--shadow-gold)',
              fontFamily: 'var(--font-korean)',
            }}
          >
            코치 대시보드로 →
          </Link>
        </div>
      </main>
    );
  }

  const svc = createServiceRoleClient();
  const { data: apps } = await svc
    .from('coach_applications')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });
  const history = (apps ?? []) as CoachApplicationRow[];
  const pending = history.find((a) => a.status === 'pending');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-7 px-4 py-8 md:py-12">
      <div>
        <p className="text-sail-gold" style={META_LABEL}>
          Coach Application
        </p>
        <h1
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.2,
          }}
        >
          코치 권한 신청
        </h1>
        <p
          className="mt-3 text-sail-mist"
          style={{ fontSize: 15, lineHeight: 1.75 }}
        >
          코치 권한을 받으면 그룹을 만들어 멤버들의 진단 결과를 한눈에 볼 수 있습니다. 신청 후 관리자가 검토합니다.
        </p>
      </div>

      {pending ? (
        <div
          className="rounded-modal border-l-2 p-7"
          style={{
            background:
              'linear-gradient(135deg, rgba(232,168,56,0.08) 0%, rgba(10,22,40,0.5) 100%)',
            borderColor: 'var(--color-sail-warning)',
          }}
        >
          <p className="text-sail-warning" style={META_LABEL}>
            Pending Review
          </p>
          <h2
            className="mt-2 font-serif text-sail-paper"
            style={{ fontSize: 18, fontWeight: 500 }}
          >
            심사 대기 중인 신청이 있습니다
          </h2>
          <p
            className="mt-2 text-sail-mist"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              letterSpacing: '0.05em',
            }}
          >
            신청일: {new Date(pending.created_at).toLocaleString('ko-KR')}
          </p>
          {pending.motivation && (
            <div
              className="mt-4 rounded-md border px-4 py-3 text-sail-paper"
              style={{
                background: 'rgba(10,22,40,0.5)',
                borderColor: 'rgba(232,237,242,0.08)',
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <strong className="text-sail-gold" style={{ fontWeight: 600 }}>
                신청 사유:
              </strong>{' '}
              {pending.motivation}
            </div>
          )}
        </div>
      ) : (
        <CoachApplyForm />
      )}

      {history.length > 0 && (
        <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
          <p className="text-sail-gold" style={META_LABEL}>
            History
          </p>
          <h2
            className="mt-2 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(18px, 2.2vw, 22px)',
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
          >
            신청 이력
          </h2>
          <ul
            className="mt-5 divide-y"
            style={{ borderColor: 'rgba(232,237,242,0.08)' } as React.CSSProperties}
          >
            {history.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between py-3"
                style={{ fontSize: 14 }}
              >
                <span
                  className="text-sail-mist"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {new Date(a.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const base = {
    ...META_LABEL,
    fontSize: 10,
    padding: '4px 10px',
    borderRadius: 999,
  } as const;
  if (status === 'pending')
    return (
      <span
        style={{
          ...base,
          background: 'rgba(232,168,56,0.14)',
          border: '1px solid rgba(232,168,56,0.4)',
          color: 'var(--color-sail-warning)',
        }}
      >
        Pending
      </span>
    );
  if (status === 'approved')
    return (
      <span
        style={{
          ...base,
          background: 'rgba(74,222,128,0.14)',
          border: '1px solid rgba(74,222,128,0.4)',
          color: 'var(--color-sail-success)',
        }}
      >
        Approved
      </span>
    );
  return (
    <span
      style={{
        ...base,
        background: 'rgba(248,113,113,0.14)',
        border: '1px solid rgba(248,113,113,0.4)',
        color: 'var(--color-sail-danger)',
      }}
    >
      Rejected
    </span>
  );
}
