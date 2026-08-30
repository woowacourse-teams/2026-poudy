import type { Metadata } from "next";

import { foldit, geistMono, notoSansKr } from "./fonts";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsTag } from "@/components/analytics/GoogleAnalyticsTag";
import { HistoryDepthTracker } from "@/components/navigation/HistoryDepthTracker";
import { OpenInAppRedirect } from "@/components/navigation/OpenInAppRedirect";
import { BottomNavigationSlot } from "@/components/ui/BottomNavigationSlot";
import { IconSprite } from "@/components/ui/icons/sprite";
import { rootMetadata } from "@/lib/seo/metadata";

import "./globals.css";

export const metadata: Metadata = rootMetadata();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${geistMono.variable} ${foldit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <IconSprite />
        {children}
        <BottomNavigationSlot />
      </body>

      <HistoryDepthTracker />
      <OpenInAppRedirect />
      <AnalyticsProvider />
      <GoogleAnalyticsTag />
    </html>
  );
}
