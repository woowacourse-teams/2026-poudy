import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { IconSprite } from "@/components/ui/icons/sprite";
import { MockProvider } from "@/mocks/MockProvider";

import "./globals.css";

// 디자인(v1.pen)의 ui-font 는 Noto Sans KR 이다. 한글 글리프는 subsets 로 고르지
// 않고 unicode-range 로 제공되므로 latin 만 지정한다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

// 가격과 용량 같은 수치 표기에 쓴다(v1.pen 의 font-data).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Poudy",
  description: "성분을 기준으로 화장품을 탐색합니다.",
  // 로고는 배경이 비어 있어 밝은 화면과 어두운 화면에서 같은 그림을 쓴다.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon.png", type: "image/png", sizes: "256x256" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <IconSprite />
        <Suspense>
          <AnalyticsProvider />
        </Suspense>
        <MockProvider>{children}</MockProvider>
      </body>
    </html>
  );
}
