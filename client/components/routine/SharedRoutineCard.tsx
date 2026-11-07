import type { SharedRoutineResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { TimeOfDayRow } from "./RoutineCard";
import { RoutineReactionCounts } from "./RoutineReactionCounts";
import { SkinTypeChip } from "./SkinTypeChip";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

/** 둘러보기 카드(RT8). 작성자, 루틴 이름, 구간별 제품 사진을 보여 주고 누르면 공개 상세로 간다. */
export function SharedRoutineCard({ routine }: { readonly routine: SharedRoutineResponse }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      {...pressableProps}
      href={`/routines/${routine.id}`}
      className="pressable press-scale fb-surface flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <span className="flex items-center gap-2">
        <ProfileAvatar src={routine.author.profileImageUrl} className="size-8" />
        <span className="truncate text-body text-text-secondary">{routine.author.nickname}</span>
        <SkinTypeChip skinType={routine.author.skinType} />
      </span>
      <span className="flex items-center gap-2">
        <span className="truncate text-bar font-bold text-text-primary">{routine.name}</span>
        <Icon name="chevron-right" size={20} className="ms-auto shrink-0 text-text-secondary" />
      </span>
      <TimeOfDayRow timeOfDay="morning" label="아침" products={routine.morning} />
      <TimeOfDayRow timeOfDay="evening" label="저녁" products={routine.evening} />
      <RoutineReactionCounts likeCount={routine.likeCount} commentCount={routine.commentCount} />
    </Link>
  );
}
