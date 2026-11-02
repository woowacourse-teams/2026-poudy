import type { Metadata } from "next";

import { ProfileScreen } from "@/components/my-page/ProfileScreen";

export const metadata: Metadata = {
  title: "프로필 수정",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function MyProfilePage() {
  return <ProfileScreen />;
}
