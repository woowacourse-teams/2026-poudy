import type { Metadata } from "next";

import { foldit, geistMono, notoSansKr } from "./fonts";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsTag } from "@/components/analytics/GoogleAnalyticsTag";
import { HistoryDepthTracker } from "@/components/navigation/HistoryDepthTracker";
import { OpenInAppRedirect } from "@/components/navigation/OpenInAppRedirect";
import { AppInstallBanner } from "@/components/ui/AppInstallBanner";
import { AppQrPanel } from "@/components/ui/AppQrPanel";
import { AppScrollIndicator } from "@/components/ui/AppScrollIndicator";
import { BottomNavigationSlot } from "@/components/ui/BottomNavigationSlot";
import { IconSprite } from "@/components/ui/icons/sprite";
import { InquiryButtonSlot } from "@/components/ui/InquiryButtonSlot";
import { rootMetadata } from "@/lib/seo/metadata";

import "./globals.css";

export const metadata: Metadata = rootMetadata();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /*
     * 앱 WebView 는 확대를 막으려고 React 가 붙기 전에 `<html>` 에 `touch-action` 을 넣는다.
     * 서버가 그린 HTML 과 달라 hydration 경고가 뜨므로 이 요소의 속성만 비교에서 뺀다.
     * 아래 요소는 그대로 비교한다.
     *
     * 데스크톱 트랙패드로 위아래 끝을 넘겨 스크롤하면 본문 카드와 바깥 바탕이 함께 출렁인다.
     * 정밀한 포인터에서만 세로 바운스를 막는다. 모바일에서 막으면 당겨서 새로고침도 꺼지고,
     * 가로까지 막으면 두 손가락 스와이프로 뒤로 가기가 안 되므로 세로 축만 막는다.
     */
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${geistMono.variable} ${foldit.variable} h-full antialiased pointer-fine:overscroll-y-none`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col pointer-fine:overscroll-y-none">
        <IconSprite />
        {/* 머리보다 위에 붙어야 하므로 본문 앞에 둔다. */}
        <AppInstallBanner />
        {children}
        <BottomNavigationSlot />
        <InquiryButtonSlot />
        <AppQrPanel />
        <AppScrollIndicator />
      </body>

      <HistoryDepthTracker />
      <OpenInAppRedirect />
      <AnalyticsProvider />
      <GoogleAnalyticsTag />
    </html>
  );
}
