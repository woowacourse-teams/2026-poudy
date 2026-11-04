import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoutineDetailScreen } from "@/components/routine/RoutineDetailScreen";

export const metadata: Metadata = {
  title: "루틴",
  robots: { index: false },
  openGraph: null,
  twitter: null,
};

export default async function Page({ params }: PageProps<"/routine/[routineId]">) {
  const { routineId } = await params;
  const id = Number(routineId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return <RoutineDetailScreen key={id} routineId={id} />;
}
