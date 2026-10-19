import type { Metadata } from "next";

import { SkinFilterScreen } from "@/components/skin-filter/SkinFilterScreen";

export const metadata: Metadata = {
  title: "나만의 필터",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function MySkinFilterPage() {
  return <SkinFilterScreen />;
}
