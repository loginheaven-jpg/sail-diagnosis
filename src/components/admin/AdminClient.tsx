'use client';

/**
 * AdminClient — 코치 신청 승인/거부 + 사용자 역할 변경
 */

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatPhone } from '@/lib/phone';
import type {
  CoachApplicationRow,
  UserRole,
  UserRow,
} from '@/types/database';

interface PendingApp extends CoachApplicationRow {
  user: Pick<UserRow, 'full_name' | 'nickname' | 'email' | 'phone'> | null;
}

interface Props {
  initialPendingApps: PendingApp[];
  initialUsers: UserRow[];
}

export function AdminClient({ initialPendingApps, initialUsers }: Props) {
  const [pending, setPending] = useState<PendingApp[]>(initialPendingApps);
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [error, setError] = useState<string | null>(null);

  const review = async (id: string, decision: 'approve' | 'reject') => {
    setError(null);
    try {
      const res = await fetch(`/api/coach-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? '처리 실패');
        return;
      }
      // 목록에서 제거 + 승인이면 user role도 갱신
      const app = pending.find((a) => a.id === id);
      setPending((prev) => prev.filter((a) => a.id !== id));
      if (decision === 'approve' && app) {
        setUsers((prev) =>
          prev.map((u) => (u.id === app.user_id ? { ...u, role: 'coach' } : u))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const changeRole = async (userId: string, role: UserRole) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? '변경 실패');
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
          {error}
        </div>
      )}

      {/* 코치 신청 대기 */}
      <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
        <h2 className="mb-1 text-h3 font-bold text-sail-navy">
          코치 신청 대기 ({pending.length})
        </h2>
        <p className="mb-5 text-bodySm text-sail-gray-600">
          승인 시 사용자의 권한이 즉시 코치로 변경됩니다.
        </p>
        {pending.length === 0 ? (
          <p className="rounded-card bg-sail-gray-50 px-4 py-6 text-center text-bodySm text-sail-gray-500">
            대기 중인 신청이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-sail-gray-100">
            {pending.map((a) => (
              <li key={a.id} className="space-y-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-bodySm font-semibold text-sail-gray-900">
                      {a.user?.full_name ??
                        a.user?.nickname ??
                        a.user?.email ??
                        '익명'}
                    </p>
                    <p className="text-caption text-sail-gray-500">
                      {a.user?.email}
                      {a.user?.phone && ` · ${formatPhone(a.user.phone)}`}
                    </p>
                    {a.motivation && (
                      <p className="mt-1.5 rounded-md bg-sail-gray-50 px-3 py-2 text-bodySm text-sail-gray-700">
                        {a.motivation}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review(a.id, 'reject')}
                    >
                      거부
                    </Button>
                    <Button size="sm" onClick={() => review(a.id, 'approve')}>
                      승인
                    </Button>
                  </div>
                </div>
                <p className="text-caption text-sail-gray-400">
                  {new Date(a.created_at).toLocaleString('ko-KR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 사용자 목록 */}
      <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
        <h2 className="mb-1 text-h3 font-bold text-sail-navy">사용자</h2>
        <p className="mb-5 text-bodySm text-sail-gray-600">
          최근 가입 50명 — 역할 셀렉트로 즉시 변경 가능
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-bodySm">
            <thead>
              <tr className="border-b border-sail-gray-200 text-left text-caption text-sail-gray-500">
                <th className="pb-2 font-semibold">이름</th>
                <th className="pb-2 font-semibold">이메일</th>
                <th className="pb-2 font-semibold">전화</th>
                <th className="pb-2 font-semibold">가입일</th>
                <th className="pb-2 font-semibold">역할</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSuperAdmin = u.email === 'loginheaven@gmail.com';
                return (
                  <tr key={u.id} className="border-b border-sail-gray-100">
                    <td className="py-2.5 text-sail-gray-900">
                      {u.full_name ?? u.nickname ?? '—'}
                    </td>
                    <td className="py-2.5 text-sail-gray-600">{u.email}</td>
                    <td className="py-2.5 font-mono text-caption text-sail-gray-600">
                      {u.phone ? formatPhone(u.phone) : '—'}
                    </td>
                    <td className="py-2.5 text-caption text-sail-gray-500">
                      {new Date(u.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          changeRole(u.id, e.currentTarget.value as UserRole)
                        }
                        disabled={isSuperAdmin}
                        className="h-8 rounded-md border border-sail-gray-300 bg-white px-2 text-caption font-semibold focus:border-sail-navy focus:outline-none disabled:bg-sail-gray-100 disabled:opacity-60"
                        title={
                          isSuperAdmin
                            ? '슈퍼어드민은 권한 변경 불가'
                            : ''
                        }
                      >
                        <option value="user">멤버</option>
                        <option value="coach">코치</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
