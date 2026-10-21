'use client';

/**
 * GroupDetailClient — 그룹 헤더 + 액션(코드 회전/만료/보관/삭제)
 *   (Quiet Luxury v2.0 — 다크 네이비 + 골드)
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

// 로컬 state를 두지 않는다 — PATCH 후 router.refresh()로
// 서버 컴포넌트(=GroupDetailPage)가 재실행되며 group, InvitationBlock,
// 결과 표 등 모두에 새 데이터가 일관되게 흘러간다.
// (이전 버그: rotate 후 로컬 state만 갱신되어 InvitationBlock의 코드가 안 바뀜)

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export function GroupDetailClient({
  group,
  memberCount,
  resultCount,
}: Props) {
  const router = useRouter();
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
        // 서버 컴포넌트 재실행 → 모든 자식이 새 group을 prop으로 받음
        router.refresh();
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
    <section
      className="relative overflow-hidden rounded-modal border p-8 md:p-11"
      style={{
        background:
          'linear-gradient(160deg, rgba(15,36,56,0.85) 0%, rgba(10,22,40,0.95) 100%)',
        borderColor: 'rgba(201,162,39,0.22)',
        boxShadow:
          '0 24px 60px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        aria-hidden
        className="absolute -right-20 -top-20 h-60 w-60 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 70%)',
          filter: 'blur(28px)',
        }}
      />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2.5">
            <p className="text-sail-gold" style={META_LABEL}>
              Group
            </p>
            {isArchived && (
              <span
                className="rounded-pill px-2 py-0.5 text-sail-mist"
                style={{
                  background: 'rgba(232,237,242,0.08)',
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
                className="rounded-pill px-2 py-0.5"
                style={{
                  background: 'rgba(232,168,56,0.14)',
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
          <h1
            className="font-serif text-sail-paper"
            style={{
              fontSize: 'clamp(28px, 4vw, 38px)',
              fontWeight: 500,
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
            }}
          >
            {group.name}
          </h1>
          {group.description && (
            <p
              className="mt-3 text-sail-mist"
              style={{ fontSize: 15, lineHeight: 1.75 }}
            >
              {group.description}
            </p>
          )}
          <p
            className="mt-4 text-sail-mist/80"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              letterSpacing: '0.1em',
            }}
          >
            멤버 {memberCount}명 · 공유 동의 결과 {resultCount}건 · 정원 {group.max_members}
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
        <div
          className="rounded-modal px-5 py-4 md:min-w-[220px]"
          style={{
            background: 'rgba(10,22,40,0.5)',
            border: '1px solid rgba(201,162,39,0.3)',
          }}
        >
          <p className="text-sail-gold" style={{ ...META_LABEL, fontSize: 10 }}>
            Group Code
          </p>
          <div className="mt-2 mb-3">
            <span
              className="font-serif text-sail-gold-soft"
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: '0.3em',
              }}
            >
              {group.code}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 rounded-md transition-colors duration-200"
              style={{
                background: copied
                  ? 'rgba(74,222,128,0.15)'
                  : 'rgba(201,162,39,0.12)',
                border: copied
                  ? '1px solid rgba(74,222,128,0.4)'
                  : '1px solid rgba(201,162,39,0.3)',
                color: copied
                  ? 'var(--color-sail-success)'
                  : 'var(--color-sail-gold)',
                ...META_LABEL,
                fontSize: 10,
                padding: '5px 8px',
              }}
            >
              {copied ? '복사됨 ✓' : 'COPY'}
            </button>
            <button
              type="button"
              onClick={() => patch({ rotateCode: true }, 'rotate')}
              disabled={busy !== null}
              className="flex-1 rounded-md transition-colors duration-200 disabled:opacity-50"
              style={{
                background: 'rgba(201,162,39,0.12)',
                border: '1px solid rgba(201,162,39,0.3)',
                color: 'var(--color-sail-gold)',
                ...META_LABEL,
                fontSize: 10,
                padding: '5px 8px',
              }}
            >
              {busy === 'rotate' ? '회전 중…' : 'ROTATE'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="relative mt-5 rounded-alert border-l-2 px-5 py-3"
          style={{
            background: 'rgba(248,113,113,0.08)',
            borderColor: 'var(--color-sail-danger)',
            color: 'var(--color-sail-paper)',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {error}
        </div>
      )}

      {/* 관리 액션 */}
      <div
        className="relative mt-6 flex flex-wrap gap-2 pt-5"
        style={{ borderTop: '1px solid rgba(232,237,242,0.08)' }}
      >
        {!isArchived ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => patch({ status: 'archived' }, 'archive')}
            disabled={busy !== null}
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

      <p
        className="relative mt-4 text-sail-mist/70"
        style={{ fontSize: 12, lineHeight: 1.7 }}
      >
        멤버는 진단 시작 화면에서 코드{' '}
        <span
          className="rounded-md px-2 py-0.5"
          style={{
            background: 'rgba(201,162,39,0.12)',
            color: 'var(--color-sail-gold)',
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            letterSpacing: '0.15em',
          }}
        >
          {group.code}
        </span>
        를 입력해 참여할 수 있습니다. 결과는 참여자가 코치 공유에 별도로 동의한 경우에만 열람할 수 있습니다.
      </p>
    </section>
  );
}
