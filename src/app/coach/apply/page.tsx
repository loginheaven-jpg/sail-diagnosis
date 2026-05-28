/**
 * /coach/apply — 코치 권한 자기등록 신청
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

export default async function CoachApplyPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login?redirect=/coach/apply');

  // 이미 코치/관리자라면 대시보드로 안내
  if (auth.role === 'coach' || auth.role === 'admin') {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <div className="rounded-card border border-sail-gray-200 bg-white p-card text-center shadow-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sail-success/15 text-2xl">
            ✓
          </div>
          <h1 className="mb-2 text-h3 font-bold text-sail-gray-900">
            이미 {auth.role === 'admin' ? '관리자' : '코치'} 권한이 있어요
          </h1>
          <p className="mb-6 text-bodySm text-sail-gray-600">
            추가 신청은 필요하지 않습니다.
          </p>
          <Link
            href="/coach"
            className="inline-flex h-11 items-center rounded-button bg-sail-orange px-5 text-body font-semibold text-white shadow-card hover:bg-sail-orange-hover"
          >
            코치 대시보드로 →
          </Link>
        </div>
      </main>
    );
  }

  // 신청 이력
  const svc = createServiceRoleClient();
  const { data: apps } = await svc
    .from('coach_applications')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });
  const history = (apps ?? []) as CoachApplicationRow[];
  const pending = history.find((a) => a.status === 'pending');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8 md:py-12">
      <div>
        <p className="text-caption font-medium uppercase tracking-wide text-sail-orange">
          신청
        </p>
        <h1 className="text-h1 font-bold text-sail-gray-900">코치 권한 신청</h1>
        <p className="mt-2 text-bodySm text-sail-gray-600">
          코치 권한을 받으면 그룹을 만들어 멤버들의 진단 결과를 한눈에 볼 수
          있습니다. 신청 후 관리자가 검토합니다.
        </p>
      </div>

      {pending ? (
        <div className="rounded-card border-l-4 border-amber-500 bg-amber-50 p-card">
          <h2 className="mb-1 text-h4 font-bold text-amber-900">
            심사 대기 중인 신청이 있습니다
          </h2>
          <p className="text-bodySm text-amber-800">
            신청일: {new Date(pending.created_at).toLocaleString('ko-KR')}
          </p>
          {pending.motivation && (
            <div className="mt-3 rounded-md bg-white/60 px-3 py-2 text-bodySm text-amber-900">
              <strong>신청 사유:</strong> {pending.motivation}
            </div>
          )}
        </div>
      ) : (
        <CoachApplyForm />
      )}

      {/* 이력 */}
      {history.length > 0 && (
        <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
          <h2 className="mb-3 text-h4 font-bold text-sail-gray-900">신청 이력</h2>
          <ul className="divide-y divide-sail-gray-100 text-bodySm">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <span>
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
  if (status === 'pending')
    return (
      <span className="rounded-pill bg-amber-100 px-2.5 py-0.5 text-tiny font-semibold text-amber-800">
        심사 중
      </span>
    );
  if (status === 'approved')
    return (
      <span className="rounded-pill bg-emerald-100 px-2.5 py-0.5 text-tiny font-semibold text-emerald-800">
        승인됨
      </span>
    );
  return (
    <span className="rounded-pill bg-red-100 px-2.5 py-0.5 text-tiny font-semibold text-red-800">
      거부됨
    </span>
  );
}
