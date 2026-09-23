"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useHeightVariable } from "@/lib/hooks/useHeightVariable";
import { useHideOnScrollDown } from "@/lib/hooks/useHideOnScrollDown";
import { BOUNDARY_MARKER_CLASS, usePassedTopBoundary } from "@/lib/hooks/usePassedTopBoundary";

const PRODUCT_SEARCH_HREF = "/search/products";

/** 탭 줄이 붙는 높이. 상단바(`variant="root"`)의 높이다. */
const TOP_BAR_HEIGHT = 56;

const TABS = [
  { href: PRODUCT_SEARCH_HREF, label: "제품명 검색" },
  { href: "/search/ingredients", label: "성분 필터링" },
] as const;

/**
 * 두 검색 화면을 오가는 탭. 라우트가 달라 조건은 이어지지 않는다.
 *
 * 밑줄은 탭마다 따로 켜고 끄지 않고 하나만 두어 고른 자리로 미끄러진다. 탭마다
 * 제 밑줄을 가지면 한쪽이 꺼지고 다른 쪽이 켜질 뿐이라 툭 옮겨 붙는 것으로 보인다.
 * 하나가 움직이면 어디에서 어디로 갔는지가 그대로 보인다.
 *
 * 상단바(`variant="root"`, 56px) 아래에 함께 붙는다. 아래 선은 밑줄이 미끄러지는 길이라
 * 늘 긋는다. 본문과 갈리는 그림자는 붙은 뒤에만 드리운다. 제품명 검색은 탭 아래에 검색바가
 * 함께 붙어 그쪽이 그림자를 맡는다. 바텀시트의 딤(z-40)과 상단바(z-30) 아래에 둔다.
 *
 * 제품명 검색에서는 아래로 내리면 상단바 뒤로 숨고 위로 올리면 돌아온다. 목록을 보는 동안
 * 검색바가 탭 자리까지 올라와 화면을 넓게 쓴다. 붙는 자리는 `.search-tabs` 와
 * `.search-field-bar` 가 `data-hidden` 과 잰 탭 줄 높이(`--search-tabs-height`)로 함께 정한다.
 */
export function SearchTabs() {
  const pathname = usePathname();
  const activeIndex = Math.max(
    TABS.findIndex((tab) => pathname.startsWith(tab.href)),
    0,
  );
  const productSearch = pathname.startsWith(PRODUCT_SEARCH_HREF);
  const hidden = useHideOnScrollDown({ enabled: productSearch });
  const navRef = useHeightVariable<HTMLElement>("--search-tabs-height", productSearch);
  const { ref, passed } = usePassedTopBoundary<HTMLDivElement>({ enterAt: TOP_BAR_HEIGHT, enabled: !productSearch });

  return (
    <>
      <div ref={ref} aria-hidden="true" className={BOUNDARY_MARKER_CLASS} />
      <nav
        ref={navRef}
        aria-label="검색 방식"
        data-search-tabs
        data-hidden={hidden}
        data-stuck={passed}
        className="search-tabs stuck-edge sticky z-20 flex border-b border-border bg-background"
      >
        {TABS.map((tab, at) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={at === activeIndex ? "page" : undefined}
            className={[
              "search-tab flex-1 py-3 text-center text-[14px]",
              at === activeIndex ? "font-bold text-[#212124]" : "font-medium text-[#868B94]",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        ))}

        {/*
        탭은 flex-1 로 폭이 같다. 몇 번째인지만 알면 자리가 정해져 크기를 재지 않아도 된다.
        뜻을 전하지 않는 장식이라 보조 기술에서는 감춘다. 고른 탭은 aria-current 가 알린다.
      */}
        <span
          aria-hidden="true"
          className="search-tab-underline absolute bottom-0 left-0 h-0.5 bg-[#212124]"
          style={{ width: `${100 / TABS.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
      </nav>
    </>
  );
}
