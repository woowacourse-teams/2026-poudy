import type { Metadata } from "next";

import { foldit, geistMono, notoSansKr } from "./fonts";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalyticsTag } from "@/components/analytics/GoogleAnalyticsTag";
import { HistoryDepthTracker } from "@/components/navigation/HistoryDepthTracker";
import { OpenInAppRedirect } from "@/components/navigation/OpenInAppRedirect";
import { BottomNavigationSlot } from "@/components/ui/BottomNavigationSlot";
import { IconSprite } from "@/components/ui/icons/sprite";
import { indexingEnabled, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/seo/site";

import "./globals.css";

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
