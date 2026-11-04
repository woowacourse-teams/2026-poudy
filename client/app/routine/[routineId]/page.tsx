import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoutineDetailScreen } from "@/components/routine/RoutineDetailScreen";

export const metadata: Metadata = {
  title: "루틴",
  robots: { index: false },
  openGraph: null,
  twitter: null,
};

export default async function Page({ params, searchParams }: PageProps<"/routine/[routineId]">) {
  const { routineId } = await params;
  const { time } = await searchParams;
  const id = Number(routineId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  // 제품 추가에서 돌아오면 그 구간 탭을 그대로 연다.
  let initialTimeOfDay: "morning" | "evening" | undefined;
  if (time === "morning" || time === "evening") initialTimeOfDay = time;
  return <RoutineDetailScreen key={id} routineId={id} initialTimeOfDay={initialTimeOfDay} />;
}
