"use client";

import { TabNav, TabNavItem } from "@poudy/design-system/tab-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePendingTab } from "@/lib/hooks/usePendingTab";

type Directory = "category" | "brand";

const TABS = [
  { key: "category", label: "제품 유형", href: "/categories" },
  { key: "brand", label: "브랜드", href: "/brands" },
] as const;

/**
 * S27·S29 카테고리·브랜드 전환(명세 APP · 카테고리·브랜드 전환). 다른 화면으로 가는 링크 탭이라 TabNav 를 쓴다.
 *
 * 두 화면이 레이아웃을 함께 써서, 주소가 바뀌어도 탭은 다시 그려지지 않는다. 그래서 밑줄 하나가 이전 탭에서 새 탭으로 미끄러진다.
 */
export function DirectoryTabs() {
  // 두 화면이 레이아웃을 함께 쓰므로 지금 화면은 주소로 가린다.
  const current: Directory = usePathname().startsWith("/brands") ? "brand" : "category";
  // 다음 화면을 받는 동안 기다리면 밑줄이 한 박자 늦게 옮겨 간다. 누른 그 자리에서 먼저 옮긴다.
  const [shown, navigate] = usePendingTab<Directory>(current);

  return (
    <TabNav aria-label="탐색 방식" slide>
      {TABS.map((tab) => (
        <TabNavItem key={tab.key} current={tab.key === shown}>
          <Link href={tab.href} onNavigate={navigate(tab.key, tab.href)}>
            {tab.label}
          </Link>
        </TabNavItem>
      ))}
    </TabNav>
  );
}
