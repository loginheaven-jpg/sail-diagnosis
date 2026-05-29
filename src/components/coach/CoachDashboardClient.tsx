'use client';

/**
 * CoachDashboardClient — 그룹 목록 + 생성 모달 (Quiet Luxury v2.0)
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

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

const INPUT_BASE_STYLE: React.CSSProperties = {
  background: 'rgba(10,22,40,0.55)',
  borderColor: 'rgba(232,237,242,0.12)',
  color: 'var(--color-sail-paper)',
  fontFamily: 'var(--font-korean)',
  fontSize: 15,
};

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
        <p className="text-sail-mist" style={{ fontSize: 14 }}>
          총{' '}
          <span
            className="font-serif text-sail-gold"
            style={{ fontWeight: 600 }}
          >
            {groups.length}
          </span>
          개 그룹
        </p>
        <Button onClick={() => setShowCreate(true)}>+ 새 그룹 만들기</Button>
      </div>

      {error && (
        <div
          className="mb-4 rounded-alert border-l-2 px-5 py-4"
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

      {groups.length === 0 ? (
        <div
          className="rounded-modal border border-dashed p-12 text-center"
          style={{
            background: 'rgba(10,22,40,0.45)',
            borderColor: 'rgba(201,162,39,0.25)',
          }}
        >
          <p className="text-sail-gold" style={META_LABEL}>
            Empty Harbor
          </p>
          <p
            className="mt-3 font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(20px, 2.4vw, 24px)',
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
          >
            아직 그룹이 없습니다
          </p>
          <p
            className="mx-auto mt-3 max-w-md text-sail-mist"
            style={{ fontSize: 14, lineHeight: 1.75 }}
          >
            첫 그룹을 만들면 5자리 코드가 자동 발급됩니다. 멤버들이 이 코드를 진단 시작 화면에 입력하면 결과가 이 그룹으로 모입니다.
          </p>
          <div className="mt-7">
            <Button onClick={() => setShowCreate(true)}>+ 첫 그룹 만들기</Button>
          </div>
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
      className="group block rounded-modal border p-7 transition-all duration-300 hover:-translate-y-[2px]"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
        borderColor: 'rgba(169,187,208,0.12)',
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate font-serif text-sail-paper transition-colors duration-300 group-hover:text-sail-gold-soft"
            style={{
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
          >
            {group.name}
          </h3>
          {group.description && (
            <p
              className="mt-1 line-clamp-2 text-sail-mist"
              style={{ fontSize: 12, lineHeight: 1.6 }}
            >
              {group.description}
            </p>
          )}
        </div>
        {isArchived && (
          <span
            className="rounded-pill px-2.5 py-0.5 text-sail-mist"
            style={{
              background: 'rgba(232,237,242,0.06)',
              border: '1px solid rgba(232,237,242,0.12)',
              ...META_LABEL,
              fontSize: 9,
            }}
          >
            Archived
          </span>
        )}
        {isExpired && !isArchived && (
          <span
            className="rounded-pill px-2.5 py-0.5"
            style={{
              background: 'rgba(232,168,56,0.12)',
              border: '1px solid rgba(232,168,56,0.4)',
              color: 'var(--color-sail-warning)',
              ...META_LABEL,
              fontSize: 9,
            }}
          >
            Expired
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span
          className="rounded-md px-3 py-1.5"
          style={{
            background: 'rgba(201,162,39,0.10)',
            border: '1px solid rgba(201,162,39,0.3)',
            color: 'var(--color-sail-gold)',
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.25em',
          }}
        >
          {group.code}
        </span>
        <span className="text-sail-mist/70" style={{ fontSize: 11 }}>
          멤버 가입 코드
        </span>
      </div>

      <div
        className="flex items-center justify-between pt-3 text-sail-mist"
        style={{
          borderTop: '1px solid rgba(232,237,242,0.06)',
          fontSize: 12,
        }}
      >
        <span>
          멤버{' '}
          <strong className="text-sail-paper" style={{ fontWeight: 600 }}>
            {stat.members}
          </strong>
          명
        </span>
        <span>
          결과{' '}
          <strong className="text-sail-paper" style={{ fontWeight: 600 }}>
            {stat.results}
          </strong>
          건
        </span>
        <span
          className="text-sail-mist/60"
          style={{
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.1em',
          }}
        >
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

  const labelStyle = {
    fontFamily: 'var(--font-korean)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-sail-paper)',
  } as const;

  const inputClass =
    'h-11 w-full rounded-input border px-3.5 focus:outline-none transition-colors duration-200';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{
        background: 'rgba(10,22,40,0.7)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-modal border"
        style={{
          background: 'var(--color-sail-deep)',
          borderColor: 'rgba(201,162,39,0.22)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: '1px solid rgba(169,187,208,0.12)' }}
        >
          <div>
            <p className="text-sail-gold" style={META_LABEL}>
              New Group
            </p>
            <h3
              className="mt-1 font-serif text-sail-paper"
              style={{
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: '-0.005em',
              }}
            >
              새 그룹 만들기
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-sail-mist transition-colors duration-200 hover:text-sail-gold"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-7 py-6">
          <div>
            <label className="mb-2 block" style={labelStyle}>
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
              className={inputClass}
              style={INPUT_BASE_STYLE}
            />
          </div>
          <div>
            <label className="mb-2 block" style={labelStyle}>
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              maxLength={500}
              rows={2}
              placeholder="멤버들에게 보일 그룹 안내 (선택)"
              className="w-full rounded-input border px-3.5 py-2 focus:outline-none transition-colors duration-200"
              style={INPUT_BASE_STYLE}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block" style={labelStyle}>
                정원
              </label>
              <input
                type="number"
                value={maxMembers}
                onChange={(e) =>
                  setMaxMembers(
                    Math.max(1, Math.min(1000, Number(e.currentTarget.value)))
                  )
                }
                min={1}
                max={1000}
                className={inputClass}
                style={INPUT_BASE_STYLE}
              />
            </div>
            <div>
              <label className="mb-2 block" style={labelStyle}>
                만료일 (선택)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.currentTarget.value)}
                className={inputClass}
                style={INPUT_BASE_STYLE}
              />
            </div>
          </div>
          <p
            className="text-sail-mist"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              letterSpacing: '0.05em',
            }}
          >
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
