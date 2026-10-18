"use client";

import { FilterChip } from "@poudy/design-system/filter-chip";

import type { FilterChipItem } from "@/components/product/product-chips";

type FilterChipBarProps = {
  readonly chips: readonly FilterChipItem[];
  /** 지금 열린 시트의 칩. 시트가 열려 있는 동안 그 칩은 선택 모양이다. */
  readonly expandedId?: string;
  readonly onOpen: (id: FilterChipItem["id"]) => void;
};

/**
 * 필터 칩 줄(명세 S23 제품 결과 Filter Bar Row). 높이 44 줄에 칩을 8 간격으로 놓고, 넘치면 가로로 민다.
 * 줄은 화면 끝에서 끝까지 깔리고, 첫 칩과 마지막 칩만 거터만큼 안쪽에 둔다.
 */
export function FilterChipBar({ chips, expandedId, onOpen }: FilterChipBarProps) {
  return (
    <div className="scrollbar-none scroll-px-gutter overflow-x-auto">
      <div className="flex h-11 w-max items-center gap-2 px-gutter">
        {chips.map((chip) => (
          <FilterChip
            key={chip.id}
            label={chip.label}
            value={chip.value}
            expanded={chip.id === expandedId}
            onOpen={() => onOpen(chip.id)}
          />
        ))}
      </div>
    </div>
  );
}
