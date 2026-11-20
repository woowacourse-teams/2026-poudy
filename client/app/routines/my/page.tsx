import type { Metadata } from "next";

import { MyRoutinesScreen } from "@/components/routine/MyRoutinesScreen";

export const metadata: Metadata = {
  title: "내 루틴",
  robots: { index: false },
  openGraph: null,
  twitter: null,
};

/** 내 루틴 전체 보기(S183). 루틴 탭의 '전체 보기'로 연다. */
export default function MyRoutinesPage() {
  return <MyRoutinesScreen />;
}
