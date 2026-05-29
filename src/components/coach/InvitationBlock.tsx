'use client';

/**
 * InvitationBlock — 그룹 멤버 초대 도구 (Quiet Luxury v2.0)
 *
 * - 가입 코드 / 진단 직링크 / 초대 메시지를 한 클릭 복사
 * - 네이티브 Share API (모바일에서 카카오톡 등 공유)
 * - QR 코드
 */

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { GroupRow } from '@/types/database';

interface Props {
  group: GroupRow;
}

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

const INPUT_BG = 'rgba(10,22,40,0.55)';
const INPUT_BORDER = 'rgba(232,237,242,0.12)';

export function InvitationBlock({ group }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://sail-diagnosis.vercel.app';
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
    <section
      className="rounded-modal border p-7 md:p-9"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
        borderColor: 'rgba(169,187,208,0.12)',
      }}
    >
      <p className="text-sail-gold" style={META_LABEL}>
        Invite Members
      </p>
      <h2
        className="mt-2 font-serif text-sail-paper"
        style={{
          fontSize: 'clamp(20px, 2.4vw, 24px)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}
      >
        멤버 초대
      </h2>
      <p
        className="mt-2 text-sail-mist"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        아래 항목을 멤버에게 전달하면 진단 결과가 이 그룹에 자동 연결됩니다
      </p>

      <div className="mt-7 grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <CopyRow
            label="가입 코드"
            value={group.code}
            copied={copied === 'code'}
            onCopy={() => copy('code', group.code)}
            monospace
            big
          />

          <CopyRow
            label="진단 직링크"
            value={testLink}
            copied={copied === 'link'}
            onCopy={() => copy('link', testLink)}
            description="클릭만 하면 코드가 자동 입력됩니다"
          />

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label
                className="text-sail-paper"
                style={{
                  fontFamily: 'var(--font-korean)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                초대 메시지
              </label>
              <button
                type="button"
                onClick={() => copy('message', inviteMessage)}
                className="rounded-md transition-colors duration-200"
                style={{
                  background:
                    copied === 'message'
                      ? 'rgba(74,222,128,0.15)'
                      : 'rgba(201,162,39,0.12)',
                  border:
                    copied === 'message'
                      ? '1px solid rgba(74,222,128,0.4)'
                      : '1px solid rgba(201,162,39,0.3)',
                  color:
                    copied === 'message'
                      ? 'var(--color-sail-success)'
                      : 'var(--color-sail-gold)',
                  ...META_LABEL,
                  fontSize: 10,
                  padding: '5px 10px',
                }}
              >
                {copied === 'message' ? '복사됨 ✓' : 'COPY'}
              </button>
            </div>
            <pre
              className="whitespace-pre-wrap rounded-input border px-4 py-3 text-sail-mist"
              style={{
                background: INPUT_BG,
                borderColor: INPUT_BORDER,
                fontFamily: 'var(--font-korean)',
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
{inviteMessage}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="md" onClick={nativeShare}>
              공유하기 →
            </Button>
            <a
              href={testLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-btn px-4 transition-colors duration-200"
              style={{
                background: 'transparent',
                border: '1px solid rgba(201,162,39,0.4)',
                color: 'var(--color-sail-gold)',
                fontFamily: 'var(--font-korean)',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              미리보기
            </a>
          </div>
        </div>

        {/* QR */}
        <div
          className="flex flex-col items-center gap-3 rounded-modal p-5"
          style={{
            background: 'rgba(10,22,40,0.5)',
            border: '1px solid rgba(232,237,242,0.08)',
          }}
        >
          <p className="text-sail-gold" style={{ ...META_LABEL, fontSize: 10 }}>
            QR Code
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="진단 링크 QR 코드"
            width={160}
            height={160}
            className="h-40 w-40 rounded-md"
            style={{
              background: 'var(--color-sail-paper)',
              padding: 6,
              border: '1px solid rgba(201,162,39,0.2)',
            }}
          />
          <p
            className="text-sail-mist/70"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 11,
              letterSpacing: '0.12em',
            }}
          >
            스캔하면 진단 시작
          </p>
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
      <label
        className="mb-2 block text-sail-paper"
        style={{
          fontFamily: 'var(--font-korean)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          readOnly
          value={value}
          onClick={(e) => e.currentTarget.select()}
          className="flex-1 rounded-input border px-3.5 text-sail-paper focus:outline-none transition-colors duration-200"
          style={{
            background: INPUT_BG,
            borderColor: INPUT_BORDER,
            height: big ? 56 : 40,
            fontFamily: monospace
              ? 'var(--font-serif)'
              : 'var(--font-korean)',
            fontSize: big ? 24 : 14,
            fontWeight: big ? 600 : 400,
            letterSpacing: monospace ? '0.3em' : '0.01em',
            color: big
              ? 'var(--color-sail-gold-soft)'
              : 'var(--color-sail-paper)',
          }}
        />
        <button
          type="button"
          onClick={onCopy}
          className="flex-shrink-0 rounded-btn transition-colors duration-200"
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
            fontSize: 11,
            padding: big ? '0 16px' : '0 14px',
          }}
        >
          {copied ? '복사됨 ✓' : 'COPY'}
        </button>
      </div>
      {description && (
        <p
          className="mt-2 text-sail-mist/70"
          style={{ fontSize: 12, lineHeight: 1.6 }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
