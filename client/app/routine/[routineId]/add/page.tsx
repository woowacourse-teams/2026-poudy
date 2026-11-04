import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoutineAddScreen } from "@/components/routine/RoutineAddScreen";

export const metadata: Metadata = {
  title: "루틴에 제품 추가",
  robots: { index: false },
  openGraph: null,
  twitter: null,
};

export default async function Page({ params, searchParams }: PageProps<"/routine/[routineId]/add">) {
  const { routineId } = await params;
  const { time } = await searchParams;
  const id = Number(routineId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  let timeOfDay: "morning" | "evening" = "morning";
  if (time === "evening") timeOfDay = "evening";
  return <RoutineAddScreen key={`${id}-${timeOfDay}`} routineId={id} timeOfDay={timeOfDay} />;
}
