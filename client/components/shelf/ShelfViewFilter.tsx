"use client";

import type { ShelfTab, ShelfUsageResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { useDragScroll } from "@poudy/design-system/use-drag-scroll";
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

/**
 * 파우치 보기 필터(S52 · S52b). 전체·사용 중·사용 완료 중 하나를 고른다.
 * 가로 트랙이라 화면 폭 끝까지 두고 좌우 거터를 트랙 안쪽 여백으로 가진다(LAYOUT L09). 첫 칩은 거터에서 시작하고,
 * 칩이 넘치면 화면 끝까지 밀리며 끝까지 밀면 마지막 칩 뒤에도 거터가 남는다. 스크롤바를 숨겼으므로 마우스로 끌어서도 민다.
 */
export function ShelfViewFilter({ usages, value, onValueChange }: ShelfViewFilterProps) {
  const dragScroll = useDragScroll();

  return (
    <div
      {...dragScroll}
      role="group"
      aria-label="파우치 보기"
      /*
        가로로만 민다. overflow-x 를 auto 로 두면 세로도 auto 가 되는데, 칩의 누르는 영역(::after, 위아래 6)이 줄 높이 32
        밖으로 나가 세로로 5px 밀렸다(#1235). 줄 높이는 명세대로 칩 높이와 같게 두고 세로 넘침만 감춘다.
      */
      className="scrollbar-none flex scroll-px-gutter gap-2 overflow-x-auto overflow-y-hidden px-gutter"
    >
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
