import type { Metadata } from "next";
import { Suspense } from "react";

import { RoutineScreen } from "@/components/routine/RoutineScreen";
import { RoutineScreenSkeleton } from "@/components/routine/RoutineScreenSkeleton";

export const metadata: Metadata = {
  title: "루틴",
  description: "아침과 저녁에 쓰는 화장품을 바르는 순서대로 묶어 두세요.",
  alternates: { canonical: "/routines" },
  openGraph: null,
  twitter: null,
};

/** 둘러보기 목록이 주소의 정렬(?sort=)을 읽어 화면 전체가 Suspense 에 걸린다. 그동안 같은 골격을 먼저 채운다(#1203). */
export default function RoutinePage() {
  return (
    <Suspense fallback={<RoutineScreenSkeleton />}>
      <RoutineScreen />
    </Suspense>
  );
}
