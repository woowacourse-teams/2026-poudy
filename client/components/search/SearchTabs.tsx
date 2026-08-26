"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/search/products", label: "제품명 검색" },
  { href: "/search/ingredients", label: "성분 필터링" },
] as const;

/**
 * 두 검색 화면을 오가는 탭. 라우트가 달라 조건은 이어지지 않는다.
 *
 * 밑줄은 탭마다 따로 켜고 끄지 않고 하나만 두어 고른 자리로 미끄러진다. 탭마다
 * 제 밑줄을 가지면 한쪽이 꺼지고 다른 쪽이 켜질 뿐이라 툭 옮겨 붙는 것으로 보인다.
 * 하나가 움직이면 어디에서 어디로 갔는지가 그대로 보인다.
 */
export function SearchTabs() {
  const pathname = usePathname();
  const activeIndex = Math.max(
    TABS.findIndex((tab) => pathname.startsWith(tab.href)),
    0,
  );

  return (
    <nav aria-label="검색 방식" className="relative flex border-b border-border">
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
  );
}
