"use client";

import { usePathname } from "next/navigation";

import { RoutineScreen } from "@/components/routine/RoutineScreen";

/** 지금 탭은 주소로 가린다. 두 탭이 레이아웃을 함께 쓰므로 탭을 옮겨도 화면이 다시 그려지지 않는다. */
export function RoutineListScreen() {
  return <RoutineScreen tab={usePathname().startsWith("/routines/feed") ? "browse" : "mine"} />;
}
