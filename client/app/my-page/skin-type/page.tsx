import type { Metadata } from "next";

import { ProfileFieldScreen } from "@/components/my-page/ProfileFieldScreen";

export const metadata: Metadata = {
  title: "피부 타입",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function MySkinTypePage() {
  return <ProfileFieldScreen field="skinType" />;
}
