"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import { usePressable } from "./use-pressable";

/** 고를 수 있는 값과 화면에 적을 이름의 짝. */
export type DropdownOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

export type DropdownProps<T extends string> = {
  /** 지금 고른 값. 버튼에는 이 값의 이름을 쓴다. */
  readonly value: T;
  readonly options: readonly DropdownOption<T>[];
  /** 다른 값을 고르면 부른다. 같은 값을 다시 고르면 부르지 않고 닫기만 한다. */
  readonly onChange: (value: T) => void;
  /** 목록(listbox)의 이름. 예: '정렬 기준' */
  readonly "aria-label": string;
  /**
   * 버튼 모양. default 는 목록 결과 헤더의 버튼(높이 36)이다. field 는 좁은 칸을 꽉 채우는 작은 버튼(높이 28)이고,
   * text 는 면 없이 글자와 꺾쇠만 있는 버튼이다. 작은 모양도 누르는 영역은 위아래로 넓혀 44 를 지킨다(A11Y D12).
   */
  readonly variant?: DropdownVariant;
  /** 버튼의 이름. 고른 값만으로 무엇을 고르는지 알 수 없을 때 넘긴다. 기본은 고른 값의 이름이다. */
  readonly triggerLabel?: string;
};

export type DropdownVariant = "default" | "field" | "text";

const TRIGGER: Readonly<Record<DropdownVariant, string>> = {
  default: "fb-border h-9 shrink-0 gap-1 rounded-md bg-surface px-3 leading-none font-semibold",
  field:
    "fb-border min-h-7 w-full min-w-0 justify-between gap-0.5 rounded-md bg-surface px-2 leading-none font-semibold after:absolute after:-inset-y-2 after:inset-x-0",
  text: "w-fit max-w-full min-w-0 gap-0.5 text-left leading-snug font-medium transition-colors duration-(--duration-fast) after:absolute after:-inset-y-3.5 after:inset-x-0 data-hovered:text-text-primary data-pressed:text-text-primary",
};

const OPTION_SELECTOR = '[role="option"]';
/** 목록의 높이. 행은 h-10(40) 으로 고정이고, 안쪽 여백 4 와 테두리 1 이 위아래로 붙는다. */
const ROW_PX = 40;
const FRAME_PX = 10;
/** 버튼과 목록 사이 간격(popover-below-end 의 margin) */
const GAP_PX = 4;

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
 * 드롭다운(명세 APP · 드롭다운). 버튼을 누르면 버튼 바로 아래에 목록이 열리고, 고르면 닫힌다.
 * 폼 칸에서 시트를 여는 `Select`와 달리, 목록 결과 헤더처럼 가벼운 자리에서 하나를 고를 때 쓴다.
 *
 * 목록은 브라우저 popover 로 연다. 바깥을 누르거나 Esc 를 누르면 브라우저가 닫는다. 자리는 CSS 앵커 위치
 * (`popover-below-end`)가 버튼에 붙여 잡으므로 크기를 재지 않는다. 닫히면 연 버튼으로 포커스를 돌려준다
 * (Safari 는 스스로 돌려주지 않는다). 열면 지금 값에 포커스를 두고 ↑↓·Home·End 로 옮긴다.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  "aria-label": listLabel,
  variant = "default",
  triggerLabel,
}: DropdownProps<T>) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { pressableProps } = usePressable();
  const label = options.find((option) => option.value === value)?.label ?? value;

  const select = (next: T) => {
    if (next !== value) onChange(next);
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
        // 회색 면(ui-surface) 위라 hover · 눌림은 한 단계 진한 ui-hover-on-surface 다(STATE S03). fb-surface 는 면과 같은 색이라 보이지 않는다.
        aria-label={triggerLabel}
        className={cn("pressable flex items-center text-caption text-text-secondary select-none", TRIGGER[variant])}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span
          aria-hidden="true"
          className={
            open
              ? "flex shrink-0 rotate-180 transition-transform duration-(--duration-fast) ease-out motion-reduce:transition-none"
              : "flex shrink-0 transition-transform duration-(--duration-fast) ease-out motion-reduce:transition-none"
          }
        >
          <Icon name="chevron-down" size={12} scalable />
        </span>
      </button>

      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        role="listbox"
        aria-label={listLabel}
        onBeforeToggle={(event) => {
          if (event.newState !== "open" || !triggerRef.current) return;
          // 아래 자리가 모자라고 위에는 들어가면 위로 연다. 열기 전에 정해야 커지는 기준점이 처음부터 버튼 쪽이다.
          const trigger = triggerRef.current.getBoundingClientRect();
          const height = options.length * ROW_PX + FRAME_PX + GAP_PX;
          const above = trigger.top >= height && window.innerHeight - trigger.bottom < height;
          if (above) event.currentTarget.setAttribute("data-side", "top");
          else event.currentTarget.removeAttribute("data-side");
        }}
        onToggle={(event) => {
          const opened = event.newState === "open";
          setOpen(opened);
          if (opened) {
            event.currentTarget.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
            return;
          }
          // 바깥을 눌러 다른 곳에 포커스가 간 경우는 그대로 둔다.
          const active = document.activeElement;
          if (!active || active === document.body || event.currentTarget.contains(active)) {
            triggerRef.current?.focus({ preventScroll: true });
          }
        }}
        onKeyDown={moveFocus}
        className="popover-below-end flex max-h-80 w-max max-w-[calc(100vw-2rem)] min-w-40 flex-col overflow-y-auto rounded-md border border-border bg-background p-1"
      >
        {options.map((option) => (
          <DropdownItem
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

function DropdownItem({
  label,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  // 목록 행이라 눌림 표시를 조금 늦춰, 스크롤하려고 닿은 손가락에 깜박이지 않게 한다.
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      {...pressableProps}
      // 고른 옵션은 회색 면(ui-surface)이라 hover · 눌림을 한 단계 진한 fb-border 로, 나머지는 흰 바탕 위 fb-surface 로 칠한다(STATE S03).
      className={cn(
        "pressable flex h-10 items-center justify-between gap-3 rounded-sm px-3 text-caption leading-none text-text-secondary select-none",
        selected ? "fb-border bg-surface font-semibold" : "fb-surface",
      )}
    >
      {label}
      {selected ? (
        <span aria-hidden="true" className="flex text-text-muted">
          <Icon name="check" size={16} scalable />
        </span>
      ) : null}
    </button>
  );
}
