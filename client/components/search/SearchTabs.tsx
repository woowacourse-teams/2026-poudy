"use client";

import Link from "next/link";

export type SearchMode = "product" | "ingredient";

type SearchTabsProps = {
  readonly mode: SearchMode;
  /** 탭을 옮겨도 조건은 그대로 이어진다. */
  readonly query: string;
};

const TABS: readonly { readonly mode: SearchMode; readonly label: string }[] = [
  { mode: "product", label: "제품명 검색" },
  { mode: "ingredient", label: "성분 필터링" },
];

export function SearchTabs({ mode, query }: SearchTabsProps) {
  return (
    <div role="tablist" aria-label="검색 방식" className="flex border-b border-border">
      {TABS.map((tab) => {
        const params = new URLSearchParams(query);
        params.set("mode", tab.mode);
        const selected = tab.mode === mode;

        return (
          <Link
            key={tab.mode}
            role="tab"
            aria-selected={selected}
            href={`/search?${params.toString()}`}
            scroll={false}
            className={[
              "flex-1 py-3 text-center text-[14px]",
              selected ? "border-b-2 border-text-primary font-bold text-text-primary" : "text-text-secondary",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
