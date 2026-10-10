"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { StickyBar } from "@/components/ui/StickyBar";

type Directory = "category" | "brand";

const TABS = [
  { key: "category", label: "제품 유형", href: "/categories" },
  { key: "brand", label: "브랜드", href: "/brands" },
] as const;

/**
 * S27·S29 카테고리·브랜드 탐색 전환. 화면 폭을 반씩 나눈 밑줄 탭이다.
 *
 * 밑줄은 탭마다 따로 켜고 끄지 않고 하나만 두어 고른 탭 아래로 미끄러진다. 탭마다 제
 * 밑줄을 가지면 한쪽이 꺼지고 다른 쪽이 켜질 뿐이라 툭 옮겨 붙는 것으로 보인다.
 *
 * 상단바(`variant="root"`, 56px) 아래에 함께 붙는다. 바텀시트의 딤(z-40)과 상단바(z-30) 아래에 둔다.
 */
export function DirectoryTabs() {
  // 두 화면이 레이아웃을 함께 쓰므로 지금 화면은 주소로 가린다.
  const current: Directory = usePathname().startsWith("/brands") ? "brand" : "category";

  /*
   * 다음 화면의 목록을 받는 동안 기다리면 밑줄이 한 박자 늦게 움직인다. 누른 그 자리에서 먼저 옮긴다.
   *
   * 새 페이지가 오면 그쪽 `current` 가 진실이므로 눌린 것을 버린다. 뒤로 가기처럼
   * 누르지 않고 바뀌는 길도 있어 눌린 것만 믿고 두지 않는다. 지난 `current` 를 함께
   * 들고 있다가 렌더 중에 견주는 것이 React 가 권하는 길이다. 효과로 미루면 한 번
   * 잘못 그린 뒤에 고치게 된다.
   */
  const [pressed, setPressed] = useState<{ readonly from: Directory; readonly to: Directory }>({
    from: current,
    to: current,
  });
  const shown = pressed.from === current ? pressed.to : current;

  if (pressed.from !== current) setPressed({ from: current, to: current });

  const activeIndex = Math.max(
    TABS.findIndex((tab) => tab.key === shown),
    0,
  );

  return (
    <StickyBar stuckAt={56} className="sticky top-14 z-20 bg-background">
      <nav aria-label="탐색 방식" className="relative flex h-11 border-b border-[#DEE2E9]">
        {/*
          아래 선 위에 겹쳐 그리도록 1px 내려 둔다. 폭은 탭 한 칸이고, 옮길 거리는 자기 폭만큼이다.
          뜻을 전하지 않는 장식이라 보조 기술에서는 감춘다. 고른 탭은 aria-current 가 알린다.
        */}
        <span
          aria-hidden="true"
          className="directory-tab-indicator absolute -bottom-px left-0 h-0.5 w-1/2 bg-[#182132]"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />

        {TABS.map((tab) => {
          const selected = tab.key === shown;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              onClick={() => setPressed({ from: current, to: tab.key })}
              /* 지금 어느 화면인지는 라우트가 정한다. 눌린 것과 어긋나는 짧은 동안에도 실제를 알린다. */
              aria-current={tab.key === current ? "page" : undefined}
              className={`relative flex flex-1 items-center justify-center text-[15px] ${
                selected ? "font-bold text-[#182132]" : "font-medium text-[#566273]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </StickyBar>
  );
}
