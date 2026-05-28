'use client';

/**
 * GroupDetailClient — 그룹 헤더 + 액션(코드 회전/만료/보관/삭제) (client)
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { GroupRow } from '@/types/database';

interface Props {
  group: GroupRow;
  memberCount: number;
  resultCount: number;
}

export function GroupDetailClient({
  group: initial,
  memberCount,
  resultCount,
}: Props) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupRow>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isArchived = group.status === 'archived';
  const isExpired =
    group.expires_at && new Date(group.expires_at).getTime() < Date.now();

  const patch = async (body: Record<string, unknown>, busyKey: string) => {
    setBusy(busyKey);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { group?: GroupRow; error?: string };
      if (!res.ok || !json.group) {
        setError(json.error ?? '실패');
      } else {
        setGroup(json.group);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      `'${group.name}' 그룹을 삭제할까요?\n멤버 가입 정보와 그룹 연결이 모두 사라집니다 (진단 결과 자체는 유지됨).`
    );
    if (!ok) return;
    setBusy('delete');
    setError(null);
    try {
      const res = await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? '삭제 실패');
        setBusy(null);
        return;
      }
      router.push('/coach');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <section className="rounded-question bg-sail-navy p-card text-white shadow-card-hover md:p-question">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-sail-orange">
            그룹
            {isArchived && (
              <span className="rounded-pill bg-white/20 px-2 py-0.5 text-tiny text-white">
                보관됨
              </span>
            )}
            {isExpired && !isArchived && (
              <span className="rounded-pill bg-amber-300/30 px-2 py-0.5 text-tiny text-amber-100">
                만료됨
              </span>
            )}
          </div>
          <h1 className="text-h1 font-bold leading-tight">{group.name}</h1>
          {group.description && (
            <p className="mt-2 text-bodySm opacity-85">{group.description}</p>
          )}
          <p className="mt-3 text-caption opacity-75">
            멤버 {memberCount}명 · 결과 {resultCount}건 · 정원 {group.max_members}
            {group.expires_at && (
              <>
                {' · '}
                만료{' '}
                {new Date(group.expires_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </>
            )}
          </p>
        </div>

        {/* 가입 코드 박스 */}
        <div className="rounded-card bg-white/10 px-5 py-4 backdrop-blur-sm md:min-w-[200px]">
          <p className="mb-1 text-tiny font-semibold uppercase tracking-wide opacity-75">
            가입 코드
          </p>
          <div className="mb-2 flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold tracking-widest">
              {group.code}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 rounded-md bg-white/20 px-2 py-1 text-tiny font-semibold hover:bg-white/30"
            >
              {copied ? '복사됨 ✓' : '복사'}
            </button>
            <button
              type="button"
              onClick={() => patch({ rotateCode: true }, 'rotate')}
              disabled={busy !== null}
              className="flex-1 rounded-md bg-white/20 px-2 py-1 text-tiny font-semibold hover:bg-white/30 disabled:opacity-50"
            >
              {busy === 'rotate' ? '회전 중…' : '코드 회전'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-alert border-l-4 border-amber-300 bg-amber-50/15 px-4 py-2 text-bodySm text-amber-100">
          {error}
        </div>
      )}

      {/* 관리 액션 */}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4 text-bodySm">
        {!isArchived ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => patch({ status: 'archived' }, 'archive')}
            disabled={busy !== null}
            className="border-white/40 bg-transparent text-white hover:bg-white/10"
          >
            {busy === 'archive' ? '보관 중…' : '보관함으로'}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => patch({ status: 'active' }, 'activate')}
            disabled={busy !== null}
            className="border-white/40 bg-transparent text-white hover:bg-white/10"
          >
            {busy === 'activate' ? '활성화 중…' : '다시 활성화'}
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          type="button"
          onClick={handleDelete}
          disabled={busy !== null}
        >
          {busy === 'delete' ? '삭제 중…' : '그룹 삭제'}
        </Button>
      </div>

      <p className="mt-3 text-tiny opacity-70">
        멤버는 진단 시작 화면에서 코드{' '}
        <span className="rounded-md bg-white/20 px-2 py-0.5 font-mono font-bold">
          {group.code}
        </span>
        를 입력하면 결과가 이 그룹으로 모입니다.
      </p>
    </section>
  );
}
