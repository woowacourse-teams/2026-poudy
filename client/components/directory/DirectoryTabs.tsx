"use client";

import Link from "next/link";
import { useState } from "react";

type Directory = "category" | "brand";

const TABS = [
  { key: "category", label: "카테고리", href: "/categories" },
  { key: "brand", label: "브랜드", href: "/brands" },
] as const;

/**
 * 디자인의 카테고리·브랜드 탐색 전환.
 * 회색 바탕 위에서 고른 쪽만 흰 알약으로 떠오른다.
 *
 * 알약은 탭마다 따로 켜고 끄지 않고 하나만 두어 고른 자리로 미끄러진다. 탭마다 제
 * 배경을 가지면 한쪽이 꺼지고 다른 쪽이 켜질 뿐이라 툭 옮겨 붙는 것으로 보인다.
 */
export function DirectoryTabs({ current }: { readonly current: Directory }) {
  /*
   * 두 화면은 라우트가 갈라 있어 페이지가 통째로 다시 그려진다. 도착한 뒤에 옮기면
   * 알약이 사라졌다 다시 생길 뿐이라, 누른 그 자리에서 먼저 옮긴다.
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
    <nav aria-label="탐색 방식" className="relative flex h-11 gap-0.5 rounded-xl bg-[#F2F3F5] p-[3px]">
      {/*
        바탕에 3px 안쪽 여백과 탭 사이 2px 간격이 있다. 알약은 그 안에서 한 칸을
        차지하므로 여백과 간격을 뺀 절반이 폭이고, 옮길 거리는 폭에 간격을 더한 만큼이다.
        뜻을 전하지 않는 장식이라 보조 기술에서는 감춘다. 고른 탭은 aria-current 가 알린다.
      */}
      <span
        aria-hidden="true"
        className="directory-tab-pill absolute top-[3px] bottom-[3px] left-[3px] rounded-[9px] bg-background"
        style={{
          width: "calc((100% - 6px - 2px) / 2)",
          transform: `translateX(calc(${activeIndex} * (100% + 2px)))`,
        }}
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
            className={`directory-tab relative flex flex-1 items-center justify-center rounded-[9px] text-[13px] ${
              selected ? "font-bold text-[#E83D61]" : "font-medium text-[#72747A]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
