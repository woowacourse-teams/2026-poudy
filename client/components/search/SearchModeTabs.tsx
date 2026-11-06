"use client";

import { TabNav, TabNavItem } from "@poudy/design-system/tab-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MODES = [
  { key: "product", label: "제품명 검색", href: "/search/products" },
  { key: "ingredient", label: "성분 필터링", href: "/search/ingredients" },
] as const;

/**
 * 검색 모드 탭(명세 APP · 검색 모드 탭). 두 화면을 오가는 링크라 뒤로 가기 기록에 남는다.
 * 경로가 달라 조건은 탭을 건너 이어지지 않는다.
 *
 * 검색 레이아웃에 있어 두 화면을 오가도 다시 그려지지 않는다. 그래서 지금 화면은 주소로 가린다.
 */
export function SearchModeTabs() {
  const current = usePathname().startsWith("/search/ingredients") ? "ingredient" : "product";

  return (
    // 탭을 고르면 밑줄이 이전 탭에서 새 탭으로 미끄러진다(View Transition).
    <TabNav aria-label="검색 방식" transitionName="search-mode-tab-indicator">
      {MODES.map((mode) => (
        <TabNavItem key={mode.key} current={mode.key === current}>
          <Link href={mode.href}>{mode.label}</Link>
        </TabNavItem>
      ))}
    </TabNav>
  );
}
