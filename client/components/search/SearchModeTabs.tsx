import { TabNav, TabNavItem } from "@poudy/design-system/tab-nav";
import Link from "next/link";

export type SearchMode = "product" | "ingredient";

/**
 * 검색 모드 탭(명세 APP · 검색 모드 탭). 두 화면을 오가는 링크라 뒤로 가기 기록에 남는다.
 * 경로가 달라 조건은 탭을 건너 이어지지 않는다.
 */
export function SearchModeTabs({ current }: { readonly current: SearchMode }) {
  return (
    // 탭을 고르면 밑줄이 이전 탭에서 새 탭으로 미끄러진다(View Transition). 두 화면이 같은 이름을 써서 이어진다.
    <TabNav aria-label="검색 방식" transitionName="search-mode-tab-indicator">
      <TabNavItem current={current === "product"}>
        <Link href="/search/products">제품명 검색</Link>
      </TabNavItem>
      <TabNavItem current={current === "ingredient"}>
        <Link href="/search/ingredients">성분 필터링</Link>
      </TabNavItem>
    </TabNav>
  );
}
