import type { Metadata } from "next";

import { foldit, geistMono, notoSansKr } from "./fonts";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsTag } from "@/components/analytics/GoogleAnalyticsTag";
import { HistoryDepthTracker } from "@/components/navigation/HistoryDepthTracker";
import { OpenInAppRedirect } from "@/components/navigation/OpenInAppRedirect";
import { AppInstallBanner } from "@/components/ui/AppInstallBanner";
import { AppQrPanel } from "@/components/ui/AppQrPanel";
import { BottomNavigationSlot } from "@/components/ui/BottomNavigationSlot";
import { IconSprite } from "@/components/ui/icons/sprite";
import { InquiryButtonSlot } from "@/components/ui/InquiryButtonSlot";
import { rootMetadata } from "@/lib/seo/metadata";

import "./globals.css";

export const metadata: Metadata = rootMetadata();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${geistMono.variable} ${foldit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <IconSprite />
        {/* 머리보다 위에 붙어야 하므로 본문 앞에 둔다. */}
        <AppInstallBanner />
        {children}
        <BottomNavigationSlot />
        <InquiryButtonSlot />
        <AppQrPanel />
      </body>

      <HistoryDepthTracker />
      <OpenInAppRedirect />
      <AnalyticsProvider />
      <GoogleAnalyticsTag />
    </html>
  );
}
