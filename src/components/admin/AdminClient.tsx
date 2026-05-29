'use client';

/**
 * AdminClient — 코치 신청 승인/거부 + 사용자 역할 변경 (Quiet Luxury v2.0)
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

const SECTION_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
  borderColor: 'rgba(169,187,208,0.12)',
};

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

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
        <div
          className="rounded-alert border-l-2 px-5 py-4"
          style={{
            background: 'rgba(248,113,113,0.08)',
            borderColor: 'var(--color-sail-danger)',
            color: 'var(--color-sail-paper)',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <span style={{ color: 'var(--color-sail-danger)', fontWeight: 600 }}>
            ⚠ 오류
          </span>{' '}
          — {error}
        </div>
      )}

      {/* 코치 신청 대기 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          Pending Applications
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(20px, 2.4vw, 24px)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          코치 신청 대기 ({pending.length})
        </h2>
        <p
          className="mt-2 text-sail-mist"
          style={{ fontSize: 14, lineHeight: 1.7 }}
        >
          승인 시 사용자의 권한이 즉시 코치로 변경됩니다.
        </p>

        {pending.length === 0 ? (
          <p
            className="mt-6 rounded-card border px-4 py-6 text-center text-sail-mist"
            style={{
              background: 'rgba(10,22,40,0.45)',
              borderColor: 'rgba(232,237,242,0.08)',
              fontSize: 14,
            }}
          >
            대기 중인 신청이 없습니다.
          </p>
        ) : (
          <ul
            className="mt-5 divide-y"
            style={{ borderColor: 'rgba(232,237,242,0.08)' } as React.CSSProperties}
          >
            {pending.map((a) => (
              <li key={a.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sail-paper"
                      style={{ fontSize: 15, fontWeight: 500 }}
                    >
                      {a.user?.full_name ??
                        a.user?.nickname ??
                        a.user?.email ??
                        '익명'}
                    </p>
                    <p
                      className="mt-0.5 text-sail-mist"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 12,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {a.user?.email}
                      {a.user?.phone && ` · ${formatPhone(a.user.phone)}`}
                    </p>
                    {a.motivation && (
                      <p
                        className="mt-2.5 rounded-md border px-4 py-3 text-sail-paper"
                        style={{
                          background: 'rgba(10,22,40,0.5)',
                          borderColor: 'rgba(232,237,242,0.08)',
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
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
                <p
                  className="text-sail-mist/60"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11,
                    letterSpacing: '0.12em',
                  }}
                >
                  {new Date(a.created_at).toLocaleString('ko-KR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 사용자 목록 */}
      <section className="rounded-modal border p-7 md:p-9" style={SECTION_STYLE}>
        <p className="text-sail-gold" style={META_LABEL}>
          Users
        </p>
        <h2
          className="mt-2 font-serif text-sail-paper"
          style={{
            fontSize: 'clamp(20px, 2.4vw, 24px)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          사용자
        </h2>
        <p
          className="mt-2 text-sail-mist"
          style={{ fontSize: 14, lineHeight: 1.7 }}
        >
          최근 가입 50명 — 역할 셀렉트로 즉시 변경 가능
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full" style={{ fontSize: 14 }}>
            <thead>
              <tr
                className="text-left text-sail-mist"
                style={{
                  borderBottom: '1px solid rgba(232,237,242,0.1)',
                  ...META_LABEL,
                  fontSize: 10,
                }}
              >
                <th className="pb-3 font-semibold">이름</th>
                <th className="pb-3 font-semibold">이메일</th>
                <th className="pb-3 font-semibold">전화</th>
                <th className="pb-3 font-semibold">가입일</th>
                <th className="pb-3 font-semibold">역할</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSuperAdmin = u.email === 'loginheaven@gmail.com';
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid rgba(232,237,242,0.05)',
                    }}
                  >
                    <td className="py-3 text-sail-paper">
                      {u.full_name ?? u.nickname ?? '—'}
                    </td>
                    <td className="py-3 text-sail-mist">{u.email}</td>
                    <td
                      className="py-3 text-sail-mist"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 12,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {u.phone ? formatPhone(u.phone) : '—'}
                    </td>
                    <td
                      className="py-3 text-sail-mist/70"
                      style={{ fontSize: 12 }}
                    >
                      {new Date(u.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          changeRole(u.id, e.currentTarget.value as UserRole)
                        }
                        disabled={isSuperAdmin}
                        className="h-8 rounded-md border px-2 text-sail-paper focus:outline-none disabled:opacity-50"
                        style={{
                          background: 'rgba(10,22,40,0.6)',
                          borderColor: 'rgba(232,237,242,0.15)',
                          fontFamily: 'var(--font-serif)',
                          fontSize: 12,
                          letterSpacing: '0.05em',
                        }}
                        title={isSuperAdmin ? '슈퍼어드민은 권한 변경 불가' : ''}
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
