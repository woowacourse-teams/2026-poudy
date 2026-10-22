"use client";

import type { ShelfTab, ShelfUsageResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";

import { TAB_LABEL } from "@/lib/domain/shelf";

type ViewChipProps = {
  readonly usage: ShelfUsageResponse;
  readonly selected: boolean;
  readonly onSelect: () => void;
};

/**
 * 보기 칩. 모양은 필터 칩(명세 APP · 필터 칩)을 따르되 꺾쇠가 없고 시트를 열지 않는다.
 * 디자인 시스템의 FilterChip 은 시트를 여는 버튼(aria-haspopup)이라 쓰지 않는다(보고의 명세 판단 참고).
 */
function ViewChip({ usage, selected, onSelect }: ViewChipProps) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-pressed={selected}
      {...pressableProps}
      onClick={onSelect}
      className={cn(
        "pressable inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-body-sm leading-none font-medium whitespace-nowrap select-none after:absolute after:inset-x-0 after:-inset-y-1.5",
        selected
          ? "fb-dim border-text-primary bg-action text-action-text"
          : "fb-surface border-border-strong bg-background text-text-primary",
      )}
    >
      {/* 서버가 주는 탭 이름 대신 명세의 이름을 쓴다(S52 '사용 완료'). */}
      {`${TAB_LABEL[usage.code]} ${usage.count}`}
    </button>
  );
}

type ShelfViewFilterProps = {
  readonly usages: readonly ShelfUsageResponse[];
  readonly value: ShelfTab;
  readonly onValueChange: (tab: ShelfTab) => void;
};

/** 선반 보기 필터(S52 · S52b). 전체·사용 중·사용 완료 중 하나를 고른다. */
export function ShelfViewFilter({ usages, value, onValueChange }: ShelfViewFilterProps) {
  return (
    <div role="group" aria-label="선반 보기" className="flex gap-2 overflow-x-auto scrollbar-none">
      {usages.map((usage) => (
        <ViewChip
          key={usage.code}
          usage={usage}
          selected={usage.code === value}
          onSelect={() => onValueChange(usage.code)}
        />
      ))}
    </div>
  );
}
