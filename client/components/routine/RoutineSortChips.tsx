"use client";

import type { SharedRoutineSort } from "@poudy/api/api.zod";
import { ToggleChip, ToggleGroup } from "@poudy/design-system/toggle-chip";

const SORTS = [
  { value: "LATEST", label: "최신순" },
  { value: "LIKES", label: "좋아요순" },
  { value: "COMMENTS", label: "댓글순" },
] as const satisfies readonly { readonly value: SharedRoutineSort; readonly label: string }[];

/** 둘러보기 정렬 칩(RT8). 하나만 켜지고, 켠 칩을 다시 눌러도 꺼지지 않는다. 인기순은 계산 기준이 정해지면 더한다. */
export function RoutineSortChips({
  value,
  onValueChange,
}: {
  readonly value: SharedRoutineSort;
  readonly onValueChange: (sort: SharedRoutineSort) => void;
}) {
  return (
    <ToggleGroup aria-label="둘러보기 정렬">
      {SORTS.map((sort) => (
        <ToggleChip
          key={sort.value}
          size="sm"
          pressed={value === sort.value}
          onPressedChange={() => onValueChange(sort.value)}
        >
          {sort.label}
        </ToggleChip>
      ))}
    </ToggleGroup>
  );
}
