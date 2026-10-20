"use client";

import { TabNav, TabNavItem } from "@poudy/design-system/tab-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useState } from "react";

type Directory = "category" | "brand";

const TABS = [
  { key: "category", label: "제품 유형", href: "/categories" },
  { key: "brand", label: "브랜드", href: "/brands" },
] as const;

/**
 * S27·S29 카테고리·브랜드 전환(명세 APP · 카테고리·브랜드 전환). 다른 화면으로 가는 링크 탭이라 TabNav 를 쓴다.
 *
 * 두 화면이 레이아웃을 함께 써서, 주소가 바뀌어도 탭은 다시 그려지지 않는다.
 */
export function DirectoryTabs() {
  // 두 화면이 레이아웃을 함께 쓰므로 지금 화면은 주소로 가린다.
  const current: Directory = usePathname().startsWith("/brands") ? "brand" : "category";

  /*
   * 다음 화면을 받는 동안 기다리면 밑줄이 한 박자 늦게 옮겨 간다. 누른 그 자리에서 먼저 옮긴다.
   *
   * 새 페이지가 오면 그쪽 `current` 가 진실이므로 눌린 것을 버린다. 뒤로 가기처럼 누르지 않고 바뀌는 길도 있어
   * 눌린 것만 믿고 두지 않는다. 지난 `current` 를 함께 들고 있다가 렌더 중에 견준다. 효과로 미루면 한 번 잘못
   * 그린 뒤에 고치게 된다.
   */
  const [pressed, setPressed] = useState<{ readonly from: Directory; readonly to: Directory }>({
    from: current,
    to: current,
  });
  const shown = pressed.from === current ? pressed.to : current;

  if (pressed.from !== current) setPressed({ from: current, to: current });

  return (
    // 밑줄이 이전 탭에서 새 탭으로 미끄러진다(View Transition). 검색 모드 탭과 같은 방식이다.
    <TabNav aria-label="탐색 방식" transitionName="directory-tab-indicator">
      {TABS.map((tab) => (
        <TabNavItem key={tab.key} current={tab.key === shown}>
          {/* 누른 자리에서 먼저 옮기는 변경도 transition 으로 감싸야 밑줄이 View Transition 으로 옮겨 간다. */}
          <Link href={tab.href} onClick={() => startTransition(() => setPressed({ from: current, to: tab.key }))}>
            {tab.label}
          </Link>
        </TabNavItem>
      ))}
    </TabNav>
  );
}
