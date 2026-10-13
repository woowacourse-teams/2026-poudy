import type { Metadata } from "next";

import { WithdrawScreen } from "@/components/my-page/WithdrawScreen";

export const metadata: Metadata = {
  title: "탈퇴하기",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function WithdrawPage() {
  return <WithdrawScreen />;
}
