import type { Metadata } from "next";

import { SignupSkinScreen } from "@/components/signup/SignupSkinScreen";

export const metadata: Metadata = {
  title: "피부 정보 설정",
  description: "성별, 나이대와 피부 타입을 선택해 주세요.",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function SignupSkinPage() {
  return <SignupSkinScreen />;
}
