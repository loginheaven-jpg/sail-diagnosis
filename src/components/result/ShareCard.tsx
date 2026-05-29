'use client';

/**
 * ShareCard — 결과 공유 (Quiet Luxury v2.0)
 *
 * - URL 복사 (clipboard)
 * - 브라우저 네이티브 Share API (모바일)
 * - 카카오톡/트위터는 Phase 2 (next.md 보류)
 */

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useTestStore } from '@/stores/test-store';
import { SAIL_TYPES, type SailType } from '@/types/sail';

interface ShareCardProps {
  resultId: string;
  dominantType: SailType;
  nickname?: string | null;
}

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

export function ShareCard({ resultId, dominantType, nickname }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const info = SAIL_TYPES[dominantType];

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/result/${resultId}`
      : `/result/${resultId}`;

  const shareTitle = `${nickname ? nickname + '님의 ' : ''}SAIL 소통 스타일: ${info.emoji} ${info.englishName} ${info.koreanName} (${dominantType})`;
  const shareText = `${info.tagline} — SAIL 소통 스타일 진단 결과`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
      } catch {
        // 사용자 취소 — 무시
      }
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <section
      className="rounded-modal border p-7 md:p-9"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,36,56,0.6) 0%, rgba(10,22,40,0.7) 100%)',
        borderColor: 'rgba(201,162,39,0.15)',
      }}
    >
      <p
        className="text-sail-gold"
        style={{ ...META_LABEL, letterSpacing: '0.32em' }}
      >
        Share
      </p>
      <h2
        className="mt-2 font-serif text-sail-paper"
        style={{
          fontSize: 'clamp(22px, 2.6vw, 26px)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        결과 공유
      </h2>
      <p
        className="mt-2 text-sail-mist/80"
        style={{ fontSize: 14, lineHeight: 1.7 }}
      >
        이 결과는 영구 URL입니다. 동료에게 공유해 팀의 소통 매트릭스를 만들어보세요.
      </p>

      {/* URL 박스 */}
      <div
        className="mt-6 flex items-center gap-2 rounded-input border px-3 py-2.5"
        style={{
          background: 'rgba(10,22,40,0.55)',
          borderColor: 'rgba(232,237,242,0.1)',
        }}
      >
        <input
          type="text"
          readOnly
          value={url}
          onClick={(e) => e.currentTarget.select()}
          className="flex-1 truncate bg-transparent text-sail-mist focus:outline-none"
          aria-label="결과 URL"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            letterSpacing: '0.01em',
          }}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md transition-all duration-300 hover:-translate-y-[1px]"
          style={{
            background: copied
              ? 'rgba(46,158,107,0.18)'
              : 'linear-gradient(135deg, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0.08) 100%)',
            border: copied
              ? '1px solid rgba(46,158,107,0.5)'
              : '1px solid rgba(201,162,39,0.4)',
            color: copied ? 'var(--color-sail-success)' : 'var(--color-sail-gold)',
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            letterSpacing: '0.18em',
            fontWeight: 600,
            textTransform: 'uppercase',
            padding: '6px 14px',
          }}
        >
          {copied ? '복사됨 ✓' : 'COPY'}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {canNativeShare && (
          <Button variant="primary" onClick={handleNativeShare}>
            공유하기 →
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            useTestStore.getState().reset();
            window.location.href = '/test';
          }}
        >
          다시 진단하기
        </Button>
      </div>

      <p
        className="mt-5 text-sail-mist/50"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          letterSpacing: '0.15em',
          lineHeight: 1.6,
        }}
      >
        카카오톡·트위터 공유 카드는 다음 업데이트에서 제공될 예정입니다.
      </p>
    </section>
  );
}
