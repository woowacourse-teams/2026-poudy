"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "./icons/Icon";

import type { Sort } from "@/lib/domain/filter";

export const SORT_LABELS: Record<Sort, string> = {
  NAME_ASC: "제품명 오름차순",
  NAME_DESC: "제품명 내림차순",
  PRICE_DESC: "가격 높은순",
  PRICE_ASC: "가격 낮은순",
};

// 디자인의 드롭다운 순서다. API 의 열거 순서와 다르다.
const ORDER: readonly Sort[] = ["NAME_ASC", "NAME_DESC", "PRICE_DESC", "PRICE_ASC"];

type SortDropdownProps = {
  readonly value: Sort;
  readonly onChange: (sort: Sort) => void;
};

/** 디자인 C07. 정렬 4 종은 API 의 sort 와 1:1 로 맞는다. */
export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 items-center gap-1 rounded-[10px] bg-[#F2F3F5] px-3 text-[12px] font-semibold text-[#54575C]"
      >
        {SORT_LABELS[value]}
        <Icon name="chevron-down" size={12} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="정렬 기준"
          className="absolute right-0 z-10 mt-1 w-[180px] rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          {ORDER.map((sort) => (
            <li key={sort}>
              <button
                type="button"
                role="option"
                aria-selected={sort === value}
                onClick={() => {
                  onChange(sort);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between px-4 py-3 text-left text-[13px]",
                  sort === value ? "font-semibold text-text-primary" : "text-text-secondary",
                ].join(" ")}
              >
                {SORT_LABELS[sort]}
                {sort === value ? <Icon name="check" size={14} /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
