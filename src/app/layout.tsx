import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAIL — 코칭 스타일 진단',
  description:
    '당신은 어떤 항해 스타일의 코치입니까? 30문항으로 알아보는 4유형 행동 스타일 진단 — Skipper · Adventurer · Interpreter · Lifeguard.',
  applicationName: 'SAIL',
  authors: [{ name: 'SAIL Diagnosis' }],
  keywords: ['SAIL', '코칭', '진단', 'Skipper', 'Adventurer', 'Interpreter', 'Lifeguard', 'Social Styles'],
  openGraph: {
    title: 'SAIL — 코칭 스타일 진단',
    description: '나는 어떤 항해 스타일의 코치인가? 30문항 4유형 진단.',
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
        {/* Pretendard Variable Font — KCA 디자인 시스템과 동일 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-(--color-background) text-(--color-foreground)">
        {children}
      </body>
    </html>
  );
}
