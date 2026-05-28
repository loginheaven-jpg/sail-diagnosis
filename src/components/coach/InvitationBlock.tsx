'use client';

/**
 * InvitationBlock — 그룹 상세 페이지의 멤버 초대 도구
 *
 * - 그룹 가입 코드
 * - 진단 직링크 (?group=CODE)
 * - 초대 메시지 자동 생성 (그룹명 + 코드 + 안내)
 * - 각각 한 클릭 복사
 * - 네이티브 Share API (모바일에서 카카오톡 등 공유 가능)
 */

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { GroupRow } from '@/types/database';

interface Props {
  group: GroupRow;
}

export function InvitationBlock({ group }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://sail-diagnosis.vercel.app';
  const testLink = `${origin}/test?group=${group.code}`;

  const inviteMessage = `[SAIL 소통 스타일 진단]

'${group.name}' 그룹에 참여하여 소통 스타일을 진단해보세요.

👉 진단 시작: ${testLink}
또는 ${origin}/test 에 접속해 코드 ${group.code} 를 입력하세요.

· 30문항 7~9분 소요
· 결과는 영구 URL로 받습니다
· 결과는 ${group.name} 그룹에 연결되어 코치가 함께 확인합니다`;

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard 거부 — 폴백 */
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `SAIL 진단: ${group.name}`,
          text: inviteMessage,
          url: testLink,
        });
      } catch {
        /* 사용자 취소 — 무시 */
      }
    } else {
      copy('message', inviteMessage);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(testLink)}`;

  return (
    <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <h2 className="mb-1 text-h3 font-bold text-sail-navy">멤버 초대</h2>
      <p className="mb-5 text-bodySm text-sail-gray-600">
        아래 항목을 멤버에게 전달하면 진단 결과가 이 그룹에 자동 연결됩니다
      </p>

      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          {/* 가입 코드 */}
          <CopyRow
            label="가입 코드"
            value={group.code}
            copied={copied === 'code'}
            onCopy={() => copy('code', group.code)}
            monospace
            big
          />

          {/* 진단 직링크 */}
          <CopyRow
            label="진단 직링크"
            value={testLink}
            copied={copied === 'link'}
            onCopy={() => copy('link', testLink)}
            description="클릭만 하면 코드가 자동 입력됩니다"
          />

          {/* 초대 메시지 */}
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-bodySm font-semibold text-sail-gray-800">
                초대 메시지
              </label>
              <button
                type="button"
                onClick={() => copy('message', inviteMessage)}
                className="rounded-md bg-sail-navy px-3 py-1 text-tiny font-semibold text-white hover:bg-sail-navy-light"
              >
                {copied === 'message' ? '복사됨 ✓' : '메시지 복사'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-input border border-sail-gray-200 bg-sail-gray-50 px-3 py-2.5 font-sans text-bodySm leading-relaxed text-sail-gray-700">
{inviteMessage}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="md" onClick={nativeShare}>
              📤 공유하기
            </Button>
            <a
              href={testLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-button border border-sail-gray-300 bg-white px-4 text-bodySm font-semibold text-sail-gray-700 transition hover:border-sail-navy"
            >
              🔍 미리보기
            </a>
          </div>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-2 rounded-card bg-sail-gray-50 p-4">
          <p className="text-caption font-semibold text-sail-gray-600">QR 코드</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="진단 링크 QR 코드"
            width={160}
            height={160}
            className="h-40 w-40 rounded-md border border-sail-gray-200 bg-white"
          />
          <p className="text-tiny text-sail-gray-500">스캔하면 진단 시작</p>
        </div>
      </div>
    </section>
  );
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
  description,
  monospace = false,
  big = false,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  description?: string;
  monospace?: boolean;
  big?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-bodySm font-semibold text-sail-gray-800">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          readOnly
          value={value}
          onClick={(e) => e.currentTarget.select()}
          className={`flex-1 rounded-input border border-sail-gray-300 bg-sail-gray-50 px-3 ${big ? 'h-12 text-h4' : 'h-10 text-bodySm'} ${monospace ? 'font-mono tracking-widest' : ''} text-sail-gray-900 focus:border-sail-navy focus:shadow-focus focus:outline-none`}
        />
        <button
          type="button"
          onClick={onCopy}
          className="flex-shrink-0 rounded-button bg-sail-navy px-4 text-bodySm font-semibold text-white hover:bg-sail-navy-light"
        >
          {copied ? '복사됨 ✓' : '복사'}
        </button>
      </div>
      {description && (
        <p className="mt-1 text-caption text-sail-gray-500">{description}</p>
      )}
    </div>
  );
}
