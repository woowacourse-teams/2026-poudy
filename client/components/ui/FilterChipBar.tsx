"use client";

import { FilterChip, FilterResetChip } from "@poudy/design-system/filter-chip";
import { useRef } from "react";

import type { FilterChipItem } from "@/components/product/product-chips";

type FilterChipBarProps = {
  readonly chips: readonly FilterChipItem[];
  /** 지금 열린 시트의 칩. 시트가 열려 있는 동안 그 칩은 선택 모양이다. */
  readonly expandedId?: string;
  readonly onOpen: (id: FilterChipItem["id"]) => void;
  /** 값이 걸린 칩의 조건을 한 번에 비운다. 넘기지 않으면 초기화 버튼을 두지 않는다. */
  readonly onReset?: () => void;
};

/**
 * 필터 칩 줄(명세 S23 제품 결과 Filter Bar Row). 높이 44 줄에 칩을 8 간격으로 놓고, 넘치면 가로로 민다.
 * 줄은 화면 끝에서 끝까지 깔리고, 첫 칩과 마지막 칩만 거터만큼 안쪽에 둔다.
 *
 * 값이 걸린 칩이 하나라도 있으면 맨 앞에 초기화 버튼(명세 APP · 필터 초기화 버튼)을 둔다. 끝에 두면 칩이 넘칠 때
 * 끝까지 밀어야 보이므로 앞에 둔다.
 */
export function FilterChipBar({ chips, expandedId, onOpen, onReset }: FilterChipBarProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const applied = chips.some((chip) => chip.value !== undefined);

  const reset = () => {
    // 누른 버튼이 사라지므로 포커스를 첫 칩으로 옮긴다. 그대로 두면 body 로 떨어진다.
    rowRef.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
    onReset?.();
  };

  return (
    <div className="scrollbar-none scroll-px-gutter overflow-x-auto">
      <div ref={rowRef} className="flex h-11 w-max items-center gap-2 px-gutter">
        {onReset && applied ? <FilterResetChip onReset={reset} /> : null}
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
