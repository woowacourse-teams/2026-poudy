import type { Metadata } from "next";

import { RoutineScreen } from "@/components/routine/RoutineScreen";

export const metadata: Metadata = {
  title: "루틴",
  description: "아침과 저녁에 쓰는 화장품을 바르는 순서대로 묶어 두세요.",
  alternates: { canonical: "/routines" },
  openGraph: null,
  twitter: null,
};

export default function RoutinePage() {
  return <RoutineScreen />;
}
