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

import { useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useTestStore } from '@/stores/test-store';
import type { SailType } from '@/types/sail';

interface ShareCardProps {
  resultId: string;
  dominantType: SailType;
  nickname?: string | null;
  canManage: boolean;
  coachConsent: boolean;
  canShareWithCoach: boolean;
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

export function ShareCard({ resultId, canManage, coachConsent, canShareWithCoach }: ShareCardProps) {
  const [done, setDone] = useState<ShareChannel | null>(null);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const [url, setUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [consented, setConsented] = useState(coachConsent);
  const working = useRef(false);

  const flash = (channel: ShareChannel) => {
    setDone(channel);
    setTimeout(() => setDone(null), 2000);
  };
  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.position = 'fixed'; field.style.opacity = '0';
      document.body.appendChild(field); field.select();
      const copied = document.execCommand('copy'); field.remove();
      if (!copied) throw new Error('복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.');
    }
  };
  const request = async (path: string, method: string, body: Record<string, unknown>) => {
    const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : '요청을 완료하지 못했습니다. 다시 확인해 주세요.');
    return data;
  };
  const act = async (action: () => Promise<void>) => {
    if (working.current || !canManage) return;
    working.current = true; setBusy(true); setError(null); setNotice(null);
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '요청을 완료하지 못했습니다.'); }
    finally { working.current = false; setBusy(false); }
  };
  const sharedUrl = async () => {
    if (url && expiresAt && Date.parse(expiresAt) > Date.now()) return url;
    const data = await request('/api/diagnosis/share', 'POST', { resultId });
    if (typeof data.url !== 'string' || typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) throw new Error('공유 링크를 확인하지 못했습니다.');
    const target = new URL(data.url, window.location.origin);
    if (target.origin !== window.location.origin || target.pathname !== `/result/${resultId}` || !target.hash.startsWith('#share=')) throw new Error('공유 링크를 확인하지 못했습니다.');
    setUrl(target.href); setExpiresAt(data.expiresAt);
    return target.href;
  };
  const handleLink = () => void act(async () => { await copyText(await sharedUrl()); flash('link'); });
  const handleSms = () => void act(async () => {
    const text = `SAIL 비공개 결과 공유\n${await sharedUrl()}`;
    if (isMobile) window.location.href = `sms:?body=${encodeURIComponent(text)}`;
    else await copyText(text);
    flash('sms');
  });
  const handleKakao = () => void act(async () => {
    const target = await sharedUrl();
    if (window.Kakao?.isInitialized() && window.Kakao.Share?.sendDefault) {
      window.Kakao.Share.sendDefault({ objectType: 'feed', content: { title: 'SAIL 비공개 결과 공유', description: '공유 링크는 만료되거나 철회될 수 있습니다.', imageUrl: `${window.location.origin}/api/og`, link: { mobileWebUrl: target, webUrl: target } } });
    } else await copyText(`SAIL 비공개 결과 공유\n${target}`);
    flash('kakao');
  });
  const revoke = () => void act(async () => {
    await request('/api/diagnosis/share', 'DELETE', { resultId });
    setUrl(''); setExpiresAt(null); setDone(null); setNotice('발급한 공유 링크를 모두 철회했습니다.');
  });
  const revokeCoach = () => void act(async () => {
    await request('/api/diagnosis/consent', 'POST', { resultId, consent: false });
    setConsented(false); setNotice('이 결과에 대한 코치 공유 동의를 철회했습니다.');
  });
  const allowCoach = () => void act(async () => {
    await request('/api/diagnosis/consent', 'POST', { resultId, consent: true });
    setConsented(true); setNotice('이 결과를 해당 그룹 담당 코치에게 공유했습니다. 본인 접근 권한이 유효한 동안 이 화면에서 철회할 수 있습니다.');
  });

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
        {canManage ? '공유 링크는 최대 1시간 유효합니다. 본인 접근 권한이 유효한 동안 이 화면에서 링크와 코치 공유를 철회할 수 있습니다. 결과 조회와 공유 링크 열람에도 로그인이 필요합니다. 본인 결과의 코치 공유는 최대 30일입니다.' : '공유받은 결과는 다시 공유하거나 접근 권한을 바꿀 수 없습니다.'}
      </p>

      {canManage && <>
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
          placeholder="공유할 때 링크가 발급됩니다"
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
          disabled={busy}
        />
        <ChannelButton
          icon="💬"
          label="문자"
          done={done === 'sms'}
          onClick={handleSms}
          disabled={busy}
        />
        <ChannelButton
          icon=""
          label="카카오톡"
          done={done === 'kakao'}
          onClick={handleKakao}
          disabled={busy}
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

      {expiresAt && <p className="mt-3 text-xs text-sail-mist">링크 만료: {new Date(expiresAt).toLocaleString('ko-KR')}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={revoke} disabled={busy} className="text-sm text-sail-gold underline disabled:opacity-50">공유 링크 모두 철회</button>
        {canShareWithCoach && consented && <button type="button" onClick={revokeCoach} disabled={busy} className="text-sm text-sail-gold underline disabled:opacity-50">코치 공유 동의 철회</button>}
        {canShareWithCoach && !consented && <button type="button" onClick={allowCoach} disabled={busy} className="text-sm text-sail-gold underline disabled:opacity-50">이 결과를 담당 코치에게 공유하기 · 선택</button>}
      </div>
      </>}
      {error && <p role="alert" className="mt-4 text-sm text-sail-danger">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-sail-success">{notice}</p>}

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
  disabled = false,
}: {
  icon: string;
  label: string;
  done: boolean;
  onClick: () => void;
  kakao?: boolean;
  disabled?: boolean;
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
      disabled={disabled}
      className="flex items-center justify-center gap-2 rounded-btn transition-all duration-200 hover:-translate-y-[1px]"
      style={{
        ...baseStyle,
        ...CHANNEL_BTN_STYLE,
        padding: '12px 12px',
        opacity: disabled ? 0.5 : done ? 0.85 : 1,
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
