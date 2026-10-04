import type { Metadata } from "next";

import { MyPageScreen } from "@/components/my-page/MyPageScreen";

export const metadata: Metadata = {
  title: "마이페이지",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function MyPage() {
  return <MyPageScreen />;
}
