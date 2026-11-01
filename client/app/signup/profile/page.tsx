import type { Metadata } from "next";

import { SignupIdentityScreen } from "@/components/signup/SignupIdentityScreen";

export const metadata: Metadata = {
  title: "프로필 설정",
  description: "닉네임과 프로필 사진을 설정해 주세요.",
  alternates: { canonical: "/signup/profile" },
  robots: { index: false, follow: true },
  openGraph: null,
  twitter: null,
};

export default function SignupProfilePage() {
  return <SignupIdentityScreen />;
}
