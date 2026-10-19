"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { type KeyboardEvent, useId, useRef, useState } from "react";

import { SORTS, type Sort } from "@/lib/domain/filter";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";

export const SORT_LABELS: Record<Sort, string> = {
  DEFAULT: "기본순",
  PRICE_ASC: "가격 낮은순",
  PRICE_DESC: "가격 높은순",
  UNIT_PRICE_ASC: "용량별 가격 낮은순",
  UNIT_PRICE_DESC: "용량별 가격 높은순",
};

/**
 * 고를 수 있는 값과 화면에 적을 이름의 짝.
 * 위시리스트처럼 API 의 sort 에 없는 기준을 쓰는 화면이 있어 목록을 밖에서 받는다.
 */
export type SortOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

export const PRODUCT_SORT_OPTIONS: readonly SortOption<Sort>[] = SORTS.map((sort) => ({
  value: sort,
  label: SORT_LABELS[sort],
}));

type SortDropdownProps<T extends string> = {
  readonly value: T;
  readonly onChange: (sort: T) => void;
  /** 고를 수 있는 목록. 기본은 제품 목록이 쓰는 정렬 5 종이다. */
  readonly options?: readonly SortOption<T>[];
};

const OPTION_SELECTOR = '[role="option"]';

/** 목록 안에서 방향키·Home·End 로 옵션 사이를 옮긴다. 포커스만 옮기고 고르지는 않는다. */
const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
  const options = [...event.currentTarget.querySelectorAll<HTMLElement>(OPTION_SELECTOR)];
  const current = options.indexOf(document.activeElement as HTMLElement);
  const next = {
    ArrowDown: Math.min(options.length - 1, current + 1),
    ArrowUp: Math.max(0, current - 1),
    Home: 0,
    End: options.length - 1,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  options[next]?.focus();
};

/**
 * 정렬 드롭다운(명세 APP · 정렬 드롭다운, 목록 결과 헤더 gv4R9 의 오른쪽). 누르면 버튼 바로 아래에 목록이 열리고,
 * 고르면 닫힌다. 제품 목록(조건 일치 제품·카테고리 상품·브랜드 상세)과 위시리스트가 쓴다.
 *
 * 목록은 브라우저의 popover 로 연다. 바깥을 누르거나 Esc 를 누르면 브라우저가 닫고, 연 버튼으로 포커스를 돌려준다.
 * 자리는 CSS 앵커 위치(popover-below-end)가 버튼에 붙여 잡으므로 크기를 재지 않는다.
 */
export function SortDropdown<T extends string = Sort>({
  value,
  onChange,
  options = PRODUCT_SORT_OPTIONS as readonly SortOption<T>[],
}: SortDropdownProps<T>) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { pressableProps } = usePressable();
  const label = options.find((option) => option.value === value)?.label ?? value;

  const select = (sort: T) => {
    if (sort !== value) {
      requestSelectionHaptic();
      onChange(sort);
    }
    menuRef.current?.hidePopover?.();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={menuId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        {...pressableProps}
        className="pressable fb-surface flex h-9 shrink-0 items-center gap-1 rounded-md bg-surface px-3 text-caption leading-none font-semibold text-text-secondary select-none"
      >
        {label}
        <Icon
          name="chevron-down"
          size={12}
          className={
            open
              ? "rotate-180 transition-transform duration-(--duration-fast) ease-out motion-reduce:transition-none"
              : "transition-transform duration-(--duration-fast) ease-out motion-reduce:transition-none"
          }
        />
      </button>

      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        role="listbox"
        aria-label="정렬 기준"
        onToggle={(event) => {
          const opened = event.newState === "open";
          setOpen(opened);
          // 열리면 지금 고른 옵션에 포커스를 둔다. 방향키로 바로 옮길 수 있다.
          if (opened) {
            event.currentTarget.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
            return;
          }
          // 닫히면 연 버튼으로 돌려준다. Safari 는 Esc 로 닫을 때 포커스를 돌려주지 않는다.
          // 바깥을 눌러 다른 곳에 포커스가 간 경우는 그대로 둔다.
          const active = document.activeElement;
          if (!active || active === document.body || event.currentTarget.contains(active)) {
            triggerRef.current?.focus({ preventScroll: true });
          }
        }}
        onKeyDown={moveFocus}
        className="popover-below-end flex w-max min-w-40 flex-col rounded-md border border-border bg-background p-1"
      >
        {options.map((option) => (
          <SortMenuOption
            key={option.value}
            label={option.label}
            selected={option.value === value}
            onSelect={() => select(option.value)}
          />
        ))}
      </div>
    </>
  );
}

function SortMenuOption({
  label,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      {...pressableProps}
      className="pressable fb-surface flex h-10 items-center justify-between gap-3 rounded-sm px-3 text-caption leading-none text-text-secondary select-none aria-selected:bg-surface aria-selected:font-semibold"
    >
      {label}
      {selected ? <Icon name="check" size={16} className="text-text-muted" /> : null}
    </button>
  );
}
