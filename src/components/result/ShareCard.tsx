'use client';

/**
 * ShareCard — 결과 공유 (Quiet Luxury v2.0)
 *
 * 3가지 공유 채널:
 *   1. 링크 복사 — clipboard
 *   2. 문자(SMS) — sms: deep link (모바일)
 *   3. 카카오톡   — Kakao SDK가 로드돼 있으면 Kakao.Share.sendDefault,
 *                  없으면 메시지를 클립보드에 복사 + 안내
 */

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useTestStore } from '@/stores/test-store';
import { SAIL_TYPES, type SailType } from '@/types/sail';

interface ShareCardProps {
  resultId: string;
  dominantType: SailType;
  nickname?: string | null;
}

type ShareChannel = 'link' | 'sms' | 'kakao';

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      Share?: {
        sendDefault: (opts: Record<string, unknown>) => void;
      };
    };
  }
}

const META_LABEL = {
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  letterSpacing: '0.3em',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
};

const CHANNEL_BTN_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-korean)',
  fontSize: 14,
  fontWeight: 600,
};

export function ShareCard({ resultId, dominantType, nickname }: ShareCardProps) {
  const [done, setDone] = useState<ShareChannel | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const info = SAIL_TYPES[dominantType];

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  }, []);

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/result/${resultId}`
      : `/result/${resultId}`;

  const shareTitle = `${nickname ? nickname + '님의 ' : ''}SAIL 소통 스타일 · ${info.englishName} ${info.koreanName}(${dominantType})`;
  const shareText = `${info.tagline}

▼ 진단 결과 보기
${url}`;

  const flash = (ch: ShareChannel) => {
    setDone(ch);
    setTimeout(() => setDone(null), 2000);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleLink = async () => {
    await copyText(url);
    flash('link');
  };

  const handleSms = async () => {
    if (isMobile) {
      // iOS는 &body, Android는 ?body. 둘 다 호환 가능한 형태.
      window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
    } else {
      // 데스크탑 — 메시지를 복사
      await copyText(shareText);
    }
    flash('sms');
  };

  const handleKakao = async () => {
    if (
      typeof window !== 'undefined' &&
      window.Kakao?.isInitialized() &&
      window.Kakao.Share?.sendDefault
    ) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: shareTitle,
          description: info.tagline,
          imageUrl: `${window.location.origin}/api/og?type=${dominantType}`,
          link: { mobileWebUrl: url, webUrl: url },
        },
      });
    } else {
      // Kakao SDK 미설치 → 메시지 복사 + 카톡에 붙여넣기 안내
      await copyText(shareText);
    }
    flash('kakao');
  };

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
      </div>

      {/* 3채널 버튼 */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <ChannelButton
          icon="🔗"
          label="링크 복사"
          done={done === 'link'}
          onClick={handleLink}
        />
        <ChannelButton
          icon="💬"
          label="문자"
          done={done === 'sms'}
          onClick={handleSms}
        />
        <ChannelButton
          icon=""
          label="카카오톡"
          done={done === 'kakao'}
          onClick={handleKakao}
          kakao
        />
      </div>

      {done === 'kakao' &&
        typeof window !== 'undefined' &&
        !window.Kakao?.isInitialized() && (
          <p
            className="mt-3 text-sail-success"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              letterSpacing: '0.05em',
              lineHeight: 1.6,
            }}
          >
            ✓ 메시지가 복사되었습니다. 카카오톡에 붙여넣어 공유하세요.
          </p>
        )}
      {done === 'sms' && !isMobile && (
        <p
          className="mt-3 text-sail-success"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            letterSpacing: '0.05em',
            lineHeight: 1.6,
          }}
        >
          ✓ 메시지가 복사되었습니다. (모바일에서는 문자앱이 바로 열립니다)
        </p>
      )}

      <div className="mt-7 flex justify-center">
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
    </section>
  );
}

function ChannelButton({
  icon,
  label,
  done,
  onClick,
  kakao = false,
}: {
  icon: string;
  label: string;
  done: boolean;
  onClick: () => void;
  kakao?: boolean;
}) {
  const baseStyle: React.CSSProperties = kakao
    ? {
        background: '#FEE500',
        color: '#191600',
        border: '1px solid rgba(0,0,0,0.05)',
      }
    : {
        background: 'rgba(10,22,40,0.55)',
        color: 'var(--color-sail-paper)',
        border: '1px solid rgba(232,237,242,0.12)',
      };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-btn transition-all duration-200 hover:-translate-y-[1px]"
      style={{
        ...baseStyle,
        ...CHANNEL_BTN_STYLE,
        padding: '12px 12px',
        opacity: done ? 0.85 : 1,
      }}
    >
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      {kakao && (
        <span
          aria-hidden
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '-0.04em',
          }}
        >
          TALK
        </span>
      )}
      <span>{done ? '✓ 완료' : label}</span>
    </button>
  );
}
