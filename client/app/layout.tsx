import type { Metadata } from "next";
import { Foldit, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsTag } from "@/components/analytics/GoogleAnalyticsTag";
import { HistoryDepthTracker } from "@/components/navigation/HistoryDepthTracker";
import { OpenInAppRedirect } from "@/components/navigation/OpenInAppRedirect";
import { BottomNavigationSlot } from "@/components/ui/BottomNavigationSlot";
import { IconSprite } from "@/components/ui/icons/sprite";
import { indexingEnabled, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/seo/site";
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
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  verification: {
    other: {
      "naver-site-verification": "f61dfe971733b0d1d2e8b1a8e3cda559b5b62264",
    },
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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
        <HistoryDepthTracker />
        <OpenInAppRedirect />
        <Suspense>
          <AnalyticsProvider />
        </Suspense>
        <MockProvider>{children}</MockProvider>
        <BottomNavigationSlot />
      </body>
      <GoogleAnalyticsTag />
    </html>
  );
}
