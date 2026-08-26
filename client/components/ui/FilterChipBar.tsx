"use client";

import { FilterChip } from "./FilterChip";

import { useScrollEdges } from "@/lib/hooks/useScrollEdges";

export type FilterChipItem = {
  readonly id: string;
  readonly label: string;
  readonly count: number;
};

type FilterChipBarProps = {
  readonly chips: readonly FilterChipItem[];
  readonly onOpen: (id: string) => void;
};

/** 디자인의 필터 칩 바. 조건이 걸린 칩은 개수를 함께 보여 준다. */
export function FilterChipBar({ chips, onOpen }: FilterChipBarProps) {
  const { ref, edges, onScroll } = useScrollEdges("horizontal");

  return (
    /*
     * 스크롤막대를 감췄으므로 더 밀 수 있다는 것을 양 끝의 흐림으로 알린다.
     * 시트 안쪽과 같은 방식으로, 남은 쪽만 흐린다. 끝까지 밀면 마지막 칩이 또렷해진다.
     */
    <div
      ref={ref}
      onScroll={onScroll}
      data-axis="horizontal"
      data-start={edges.start}
      data-end={edges.end}
      className="edge-fade scrollbar-none -mx-4 overflow-x-auto pb-2 pl-4"
    >
      <div className="flex w-max gap-1.5 pr-4">
        {chips.map((chip) => (
          <FilterChip
            key={chip.id}
            label={chip.label}
            count={chip.count}
            selected={chip.count > 0}
            onClick={() => onOpen(chip.id)}
          />
        ))}
      </div>
    </div>
  );
}
