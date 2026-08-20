"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/search/products", label: "제품명 검색" },
  { href: "/search/ingredients", label: "성분 필터링" },
] as const;

/** 두 검색 화면을 오가는 탭. 라우트가 달라 조건은 이어지지 않는다. */
export function SearchTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="검색 방식" className="flex border-b border-border">
      {TABS.map((tab) => {
        const selected = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={[
              "flex-1 py-3 text-center text-[14px]",
              selected ? "border-b-2 border-[#212124] font-bold text-[#212124]" : "font-medium text-[#868B94]",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
