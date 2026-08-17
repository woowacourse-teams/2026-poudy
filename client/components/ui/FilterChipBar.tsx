"use client";

import { FilterChip } from "./FilterChip";

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
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-1.5">
        {chips.map((chip) => (
          <FilterChip
            key={chip.id}
            label={chip.label}
            selected={chip.count > 0}
            count={chip.count > 0 ? chip.count : undefined}
            onClick={() => onOpen(chip.id)}
          />
        ))}
      </div>
    </div>
  );
}
