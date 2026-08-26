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
    /*
     * 스크롤막대를 감췄으므로 더 밀 수 있다는 것을 양 끝의 흐림으로 알린다.
     * 흐림은 칩 위에 겹쳐 두되 누름을 가로채지 않게 pointer-events 를 끈다.
     */
    <div className="relative">
      <div className="scrollbar-none -mx-4 overflow-x-auto pb-2 pl-4">
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

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-4 w-6 bg-gradient-to-r from-white to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -right-4 w-6 bg-gradient-to-l from-white to-transparent"
      />
    </div>
  );
}
