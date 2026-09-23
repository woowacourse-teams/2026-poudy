"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/icons/Icon";
import { track } from "@/lib/analytics/track";

/** 홈에서 검색 화면으로 들어간 의도와 실제 검색 시작 사이를 나눠 본다. */
export function HomeSearchLink() {
  return (
    <Link
      href="/search/products"
      aria-label="검색"
      onClick={() => track("home_search_selected", { placement: "top_bar" })}
      className="flex size-11 items-center justify-center"
    >
      <Icon name="search" size={22} className="text-text-primary" />
    </Link>
  );
}
