'use client';

/**
 * ShareCard — 결과 공유
 *
 * - URL 복사 (clipboard)
 * - 브라우저 네이티브 Share API (모바일)
 * - 카카오톡 / 트위터 공유는 Phase 2 (next.md 보류 항목 — 카카오 SDK 도메인 등록 필요)
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

export function ShareCard({ resultId, dominantType, nickname }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const info = SAIL_TYPES[dominantType];

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/result/${resultId}`
      : `/result/${resultId}`;

  const shareTitle = `${nickname ? nickname + '님의 ' : ''}SAIL 소통 스타일: ${info.emoji} ${info.koreanName} (${dominantType}형)`;
  const shareText = `${info.tagline} — SAIL 소통 스타일 진단 결과`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 거부 시 폴백: input + select
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
        // 사용자가 취소했을 가능성 — 조용히 무시
      }
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <h2 className="mb-1 text-h3 font-bold text-sail-navy">결과 공유</h2>
      <p className="mb-5 text-bodySm text-sail-gray-600">
        이 결과는 영구 URL입니다. 동료에게 공유해 팀의 소통 매트릭스를 만들어보세요.
      </p>

      {/* URL 박스 */}
      <div className="mb-4 flex items-center gap-2 rounded-input border border-sail-gray-300 bg-sail-gray-50 px-3 py-2">
        <input
          type="text"
          readOnly
          value={url}
          onClick={(e) => e.currentTarget.select()}
          className="flex-1 truncate bg-transparent font-mono text-bodySm text-sail-gray-700 focus:outline-none"
          aria-label="결과 URL"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-sail-navy px-3 py-1.5 text-tiny font-semibold text-white transition hover:bg-sail-navy-light"
        >
          {copied ? '복사됨 ✓' : '복사'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {canNativeShare && (
          <Button variant="primary" onClick={handleNativeShare}>
            📤 공유하기
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            // 진단 다시 시작 — store reset이 localStorage도 함께 비움
            useTestStore.getState().reset();
            window.location.href = '/test';
          }}
        >
          다시 진단하기
        </Button>
      </div>

      <p className="mt-4 text-tiny text-sail-gray-500">
        카카오톡·트위터 공유 카드는 다음 업데이트에서 제공될 예정입니다.
      </p>
    </section>
  );
}
