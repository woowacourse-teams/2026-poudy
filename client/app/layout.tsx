import type { Metadata } from "next";
import { Foldit, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsTag } from "@/components/analytics/GoogleAnalyticsTag";
import { IconSprite } from "@/components/ui/icons/sprite";
import { indexingEnabled, siteUrl } from "@/lib/seo/site";
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

// 헤더의 서비스 이름에만 쓴다. 굵기를 조절할 수 있는 글꼴이라 쓰는 굵기만 받는다.
const foldit = Foldit({
  variable: "--font-foldit",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "Poudy",
  description: "화장품 전성분 기반 성분 분석 및 맞춤형 뷰티 정보 서비스, Poudy",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Poudy",
    description: "화장품 전성분 기반 성분 분석 및 맞춤형 뷰티 정보 서비스, Poudy",
    type: "website",
    locale: "ko_KR",
    siteName: "Poudy",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Poudy",
    description: "화장품 전성분 기반 성분 분석 및 맞춤형 뷰티 정보 서비스, Poudy",
    images: ["/opengraph-image"],
  },
  ...(indexingEnabled() ? {} : { robots: { index: false, follow: false } }),
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
    <html lang="ko" className={`${notoSansKr.variable} ${geistMono.variable} ${foldit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <IconSprite />
        <Suspense>
          <AnalyticsProvider />
        </Suspense>
        <MockProvider>{children}</MockProvider>
      </body>
      <GoogleAnalyticsTag />
    </html>
  );
}
