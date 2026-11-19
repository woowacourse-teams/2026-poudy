"use client";

import type { RoutineSummaryResponse } from "@poudy/api/api.zod";

import { RoutinePhotoCard, RoutineVisibilityLine } from "./RoutinePhotoCard";

import type { FeatureFlow } from "@/lib/analytics/events";
import { rememberRoutineEntry } from "@/lib/analytics/routine";

/** 내 루틴 전체 보기의 카드(S183). 사진 판 카드 아랫줄에 공개 표지와 좋아요·댓글 수를 두고, 누르면 상세로 간다. */
export function RoutineCard({
  routine,
  flow,
}: {
  readonly routine: RoutineSummaryResponse;
  readonly flow?: FeatureFlow;
}) {
  return (
    <RoutinePhotoCard
      routine={routine}
      href={`/routines/${routine.id}`}
      onNavigate={() => {
        if (flow) rememberRoutineEntry(routine, flow);
      }}
      footer={
        <RoutineVisibilityLine
          isPublic={routine.isPublic}
          likeCount={routine.likeCount}
          commentCount={routine.commentCount}
        />
      }
    />
  );
}
