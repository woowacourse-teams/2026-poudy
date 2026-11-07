import { Suspense } from "react";

import { RoutineScreen } from "@/components/routine/RoutineScreen";

export { metadata } from "../page";

export default function RoutinePage() {
  return (
    <Suspense>
      <RoutineScreen key="browse" tab="browse" />
    </Suspense>
  );
}
