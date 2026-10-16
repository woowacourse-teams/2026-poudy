import type { Metadata } from "next";

import { SignupProfileScreen } from "@/components/signup/SignupProfileScreen";

export const metadata: Metadata = {
  title: "피부 정보 설정",
  description: "성별, 나이대와 피부 타입을 선택해 주세요.",
  alternates: { canonical: "/signup/profile" },
  robots: { index: false, follow: true },
  openGraph: null,
  twitter: null,
};

export default function SignupProfilePage() {
  return <SignupProfileScreen />;
}
