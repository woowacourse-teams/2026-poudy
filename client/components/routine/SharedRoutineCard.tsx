"use client";

import type { SharedRoutineResponse } from "@poudy/api/api.zod";

import { RoutineAuthorLine, RoutinePhotoCard } from "./RoutinePhotoCard";

import { useVisibleView } from "@/components/analytics/useVisibleView";
import type { FeatureFlow } from "@/lib/analytics/events";
import { rememberFeatureFlow } from "@/lib/analytics/feature-flow";

/** 둘러보기 카드(S173). 사진 판 아래에 이름과 작성자 줄(좋아요·댓글 수)을 두고, 누르면 공개 상세로 간다. */
export function SharedRoutineCard({
  routine,
  flow,
}: {
  readonly routine: SharedRoutineResponse;
  readonly flow?: FeatureFlow;
}) {
  const { ref, record } = useVisibleView(
    "routine_feed_item_viewed",
    {
      ...flow,
      feature_flow_id: flow?.feature_flow_id ?? `routine:${routine.id}`,
      feature_source: "routine",
      entry_source: "feed",
      routine_id: routine.id,
    },
    String(routine.id),
  );

  return (
    <div ref={ref}>
      <RoutinePhotoCard
        routine={routine}
        href={`/routines/${routine.id}`}
        onNavigate={() => {
          record();
          if (flow) rememberFeatureFlow("routine", routine.id, flow);
        }}
        footer={
          <RoutineAuthorLine
            author={routine.author}
            likeCount={routine.likeCount}
            commentCount={routine.commentCount}
          />
        }
      />
    </div>
  );
}
