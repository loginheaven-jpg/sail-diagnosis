'use client';

/**
 * CoachDashboardClient — 그룹 목록 + 생성 모달 (client)
 *
 * 서버에서 받은 그룹 목록을 표시하고, 새 그룹 생성·코드 회전 등 mutation은
 * fetch로 API Route 호출.
 */

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { GroupRow } from '@/types/database';

interface Stat {
  groupId: string;
  members: number;
  results: number;
}

interface Props {
  initialGroups: GroupRow[];
  initialStats: Stat[];
}

export function CoachDashboardClient({ initialGroups, initialStats }: Props) {
  const [groups, setGroups] = useState<GroupRow[]>(initialGroups);
  const [stats, setStats] = useState<Stat[]>(initialStats);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statFor = (id: string) =>
    stats.find((s) => s.groupId === id) ?? { groupId: id, members: 0, results: 0 };

  const handleCreated = (group: GroupRow) => {
    setGroups((prev) => [group, ...prev]);
    setStats((prev) => [{ groupId: group.id, members: 0, results: 0 }, ...prev]);
    setShowCreate(false);
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-bodySm text-sail-gray-600">
          총 <span className="font-bold text-sail-navy">{groups.length}</span>개 그룹
        </p>
        <Button onClick={() => setShowCreate(true)}>+ 새 그룹 만들기</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-alert border-l-4 border-sail-danger bg-red-50 px-4 py-3 text-bodySm text-red-900">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-card border border-dashed border-sail-gray-300 bg-white p-10 text-center">
          <p className="mb-3 text-h4 font-semibold text-sail-gray-700">
            아직 그룹이 없습니다
          </p>
          <p className="mb-6 text-bodySm text-sail-gray-500">
            첫 그룹을 만들면 5자리 코드가 자동 발급됩니다. 멤버들이 이 코드를 진단 시작 화면에 입력하면 결과가 이 그룹으로 모입니다.
          </p>
          <Button onClick={() => setShowCreate(true)}>+ 첫 그룹 만들기</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} stat={statFor(g.id)} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          onError={setError}
        />
      )}
    </>
  );
}

// ============================================================
// GroupCard
// ============================================================
function GroupCard({ group, stat }: { group: GroupRow; stat: Stat }) {
  const isArchived = group.status === 'archived';
  const isExpired =
    group.expires_at && new Date(group.expires_at).getTime() < Date.now();

  return (
    <Link
      href={`/coach/groups/${group.id}`}
      className="group rounded-card border border-sail-gray-200 bg-white p-card shadow-card transition hover:border-sail-navy hover:shadow-card-hover"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-h4 font-bold text-sail-gray-900 group-hover:text-sail-navy">
            {group.name}
          </h3>
          {group.description && (
            <p className="mt-1 line-clamp-2 text-caption text-sail-gray-500">
              {group.description}
            </p>
          )}
        </div>
        {isArchived && (
          <span className="rounded-pill bg-sail-gray-100 px-2.5 py-0.5 text-tiny font-semibold text-sail-gray-600">
            보관됨
          </span>
        )}
        {isExpired && !isArchived && (
          <span className="rounded-pill bg-amber-100 px-2.5 py-0.5 text-tiny font-semibold text-amber-800">
            만료됨
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-sail-navy-bg px-3 py-1 font-mono text-bodySm font-bold tracking-widest text-sail-navy">
          {group.code}
        </span>
        <span className="text-tiny text-sail-gray-500">멤버 가입 코드</span>
      </div>

      <div className="flex items-center justify-between border-t border-sail-gray-100 pt-3 text-caption text-sail-gray-600">
        <span>
          멤버 <strong className="text-sail-gray-900">{stat.members}</strong>명
        </span>
        <span>
          진단 결과 <strong className="text-sail-gray-900">{stat.results}</strong>건
        </span>
        <span className="text-sail-gray-400">
          {new Date(group.created_at).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </Link>
  );
}

// ============================================================
// CreateGroupModal
// ============================================================
function CreateGroupModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (g: GroupRow) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState(100);
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          maxMembers,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const json = (await res.json()) as { group?: GroupRow; error?: string };
      if (!res.ok || !json.group) {
        onError(json.error ?? '생성 실패');
        setBusy(false);
        return;
      }
      onCreated(json.group);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-sail-gray-900/60 px-4 py-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-question bg-white shadow-modal">
        <div className="flex items-center justify-between border-b border-sail-gray-200 px-6 py-4">
          <h3 className="text-h4 font-bold text-sail-navy">새 그룹 만들기</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-sail-gray-500 hover:bg-sail-gray-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
              그룹 이름 <span className="text-sail-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              minLength={2}
              maxLength={50}
              placeholder="예: 2026 봄 코칭 워크숍"
              className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              maxLength={500}
              rows={2}
              placeholder="멤버들에게 보일 그룹 안내 (선택)"
              className="w-full rounded-input border border-sail-gray-300 px-3.5 py-2 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
                정원
              </label>
              <input
                type="number"
                value={maxMembers}
                onChange={(e) =>
                  setMaxMembers(Math.max(1, Math.min(1000, Number(e.currentTarget.value))))
                }
                min={1}
                max={1000}
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3.5 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-bodySm font-semibold text-sail-gray-800">
                만료일 (선택)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.currentTarget.value)}
                className="h-11 w-full rounded-input border border-sail-gray-300 px-3 text-body focus:border-sail-navy focus:shadow-focus focus:outline-none"
              />
            </div>
          </div>
          <p className="text-caption text-sail-gray-500">
            5자리 그룹 코드는 자동 생성됩니다.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
              취소
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              {busy ? '생성 중…' : '그룹 만들기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
