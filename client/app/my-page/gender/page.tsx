import type { Metadata } from "next";

import { ProfileFieldScreen } from "@/components/my-page/ProfileFieldScreen";

export const metadata: Metadata = {
  title: "성별",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function MyGenderPage() {
  return <ProfileFieldScreen field="gender" />;
}
