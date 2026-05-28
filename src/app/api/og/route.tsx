/**
 * /api/og — SNS 공유용 동적 OG 이미지 (1200×630)
 *
 * 사용: /api/og?type=S&pct=72.3&nickname=홍길동
 *
 * Next.js ImageResponse API — Edge runtime 안전.
 */

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { SAIL_TYPES, type SailType } from '@/types/sail';

export const runtime = 'edge';

const SAIL_COLORS: Record<SailType, string> = {
  S: '#1E3A5F',
  A: '#F28C38',
  I: '#6B3FA0',
  L: '#2E9E6B',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const typeParam = (searchParams.get('type') ?? 'S').toUpperCase();
  const type: SailType =
    typeParam === 'A' || typeParam === 'I' || typeParam === 'L'
      ? (typeParam as SailType)
      : 'S';
  const pctRaw = Number(searchParams.get('pct') ?? '0');
  const pct = Number.isFinite(pctRaw) ? Math.max(0, Math.min(100, pctRaw)) : 0;
  const nickname = searchParams.get('nickname')?.slice(0, 20) ?? null;

  const info = SAIL_TYPES[type];
  const color = SAIL_COLORS[type];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: color,
          color: 'white',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 상단 메타 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 28,
            fontWeight: 600,
            opacity: 0.85,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            ⛵
          </div>
          SAIL · 소통 스타일 진단
        </div>

        {/* 중앙 — 유형 + 한 줄 정의 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          {nickname && (
            <div style={{ fontSize: 32, opacity: 0.85, marginBottom: 12 }}>
              {nickname}님의 항해 스타일
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <div style={{ fontSize: 140, lineHeight: 1 }}>{info.emoji}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 36, fontWeight: 600, opacity: 0.85 }}>
                {info.englishName} · {info.axisCombo}
              </div>
              <div style={{ fontSize: 110, fontWeight: 800, lineHeight: 1.1 }}>
                {info.koreanName}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, marginTop: 24, lineHeight: 1.3 }}>
            {info.tagline}
          </div>
          {pct > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28, fontSize: 30, opacity: 0.85 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  padding: '8px 20px',
                  borderRadius: 999,
                }}
              >
                주 유형 {pct.toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* 하단 CTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            opacity: 0.85,
          }}
        >
          <div>당신은 이 항해에서 어떤 역할을 하고 있습니까?</div>
          <div style={{ fontWeight: 700 }}>sail-diagnosis.vercel.app</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
