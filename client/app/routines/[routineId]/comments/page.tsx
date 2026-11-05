import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoutineCommentsScreen } from "@/components/routine/RoutineCommentsScreen";

export const metadata: Metadata = {
  title: "루틴 댓글",
  robots: { index: false },
  openGraph: null,
  twitter: null,
};

export default async function Page({ params }: PageProps<"/routines/[routineId]/comments">) {
  const { routineId } = await params;
  const id = Number(routineId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return <RoutineCommentsScreen key={id} routineId={id} />;
}
