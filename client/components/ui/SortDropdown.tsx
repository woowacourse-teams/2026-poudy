"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "./icons/Icon";

import type { Sort } from "@/lib/domain/filter";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";

export const SORT_LABELS: Record<Sort, string> = {
  NAME_ASC: "제품명 오름차순",
  NAME_DESC: "제품명 내림차순",
  PRICE_DESC: "가격 높은순",
  PRICE_ASC: "가격 낮은순",
};

// 디자인의 드롭다운 순서다. API 의 열거 순서와 다르다.
const SORT_ORDER: readonly Sort[] = ["NAME_ASC", "NAME_DESC", "PRICE_DESC", "PRICE_ASC"];

/**
 * 고를 수 있는 값과 화면에 적을 이름의 짝.
 * 저장함처럼 API 의 sort 에 없는 기준을 쓰는 화면이 있어 목록을 밖에서 받는다.
 */
export type SortOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

export const PRODUCT_SORT_OPTIONS: readonly SortOption<Sort>[] = SORT_ORDER.map((sort) => ({
  value: sort,
  label: SORT_LABELS[sort],
}));

type SortDropdownProps<T extends string> = {
  readonly value: T;
  readonly onChange: (sort: T) => void;
  /** 고를 수 있는 목록. 기본은 제품 목록이 쓰는 정렬 4 종이다. */
  readonly options?: readonly SortOption<T>[];
};

/** 디자인 C07. 제품 목록에서는 정렬 4 종이 API 의 sort 와 1:1 로 맞는다. */
export function SortDropdown<T extends string = Sort>({
  value,
  onChange,
  options = PRODUCT_SORT_OPTIONS as readonly SortOption<T>[],
}: SortDropdownProps<T>) {
  const ORDER = options.map((option) => option.value);
  const labelOf = (sort: T) => options.find((option) => option.value === sort)?.label ?? sort;
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(() => ORDER.indexOf(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    optionRefs.current[focusedIndex]?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        triggerRef.current?.focus();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [focusedIndex, open]);

  const focusOption = (index: number) => {
    setFocusedIndex(index);
    optionRefs.current[index]?.focus();
  };

  const selectOption = (sort: T) => {
    if (sort !== value) {
      requestSelectionHaptic();
      onChange(sort);
    }
    triggerRef.current?.focus();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setFocusedIndex(ORDER.indexOf(value));
          setOpen((previous) => !previous);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setFocusedIndex(ORDER.indexOf(value));
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        className="sort-dropdown-trigger flex h-9 items-center gap-1 rounded-[10px] bg-[#F2F3F5] px-3 text-[12px] font-semibold text-[#54575C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
      >
        {labelOf(value)}
        <span className="sort-dropdown-chevron" data-open={open} aria-hidden="true">
          <Icon name="chevron-down" size={12} />
        </span>
      </button>

      <div
        id={menuId}
        role="listbox"
        aria-label="정렬 기준"
        aria-hidden={!open}
        inert={!open}
        data-open={open}
        /*
          위아래 여백을 두면 hover 배경이 옵션에만 깔리고 그 바깥으로 흰 띠가 남아
          어색하다. 여백을 없애 첫 옵션과 마지막 옵션이 모서리까지 닿게 한다.
          모서리를 넘어 칠해지지 않도록 넘치는 부분은 잘라 낸다.
        */
        className="sort-dropdown-menu absolute right-0 z-10 mt-1 w-max min-w-[156px] overflow-hidden rounded-[10px] border border-border bg-white shadow-lg"
      >
        {ORDER.map((sort, index) => (
          <button
            key={sort}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="option"
            aria-selected={sort === value}
            data-selected={sort === value}
            tabIndex={index === focusedIndex ? 0 : -1}
            onClick={() => selectOption(sort)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                focusOption((index + 1) % ORDER.length);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                focusOption((index - 1 + ORDER.length) % ORDER.length);
              } else if (event.key === "Home") {
                event.preventDefault();
                focusOption(0);
              } else if (event.key === "End") {
                event.preventDefault();
                focusOption(ORDER.length - 1);
              } else if (event.key === "Tab") {
                setOpen(false);
              }
            }}
            className={[
              "sort-dropdown-option flex h-9 w-full items-center justify-between px-3 text-left text-[12px] text-[#3C4043] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action",
              sort === value ? "bg-[#F2F3F5] font-semibold" : "bg-white",
            ].join(" ")}
          >
            {labelOf(sort)}
            {sort === value ? <Icon name="check" size={12} /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
