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
     */
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${geistMono.variable} ${foldit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
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
