import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Header } from '@/components/layout/Header';
import { TestProgressBoundary } from '@/components/test/TestProgressBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAIL — 소통 스타일 진단',
  description:
    '당신은 이 항해에서 어떤 역할을 하고 있습니까? 30문항으로 알아보는 4유형 소통 스타일 진단 — Skipper · Adventurer · Interpreter · Lifeguard.',
  applicationName: 'SAIL',
  authors: [{ name: 'SAIL Diagnosis' }],
  keywords: [
    'SAIL',
    '소통',
    '진단',
    '소통 스타일',
    'Skipper',
    'Adventurer',
    'Interpreter',
    'Lifeguard',
    'Social Styles',
    'Merrill-Reid',
  ],
  openGraph: {
    title: 'SAIL — 소통 스타일 진단',
    description: '당신은 이 항해에서 어떤 역할을 하고 있습니까? 30문항 4유형 진단.',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Cormorant Garamond (디스플레이) + Gowun Batang (한글 본문) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Gowun+Batang:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* 분위기 레이어 (전역) — atmosphere + grain. fixed로 항상 깔림. */}
        <div className="atmosphere" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        <Suspense fallback={null}>
          <TestProgressBoundary />
        </Suspense>
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
