"use client";

import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import Link from "next/link";
import type { ReactNode } from "react";

import { track } from "@/lib/analytics/track";

type CategoryTab = {
  readonly id: number;
  readonly name: string;
};

type CategoryTabsProps = {
  /** 맨 앞은 대분류 전체(`전체`), 그 뒤는 같은 대분류의 소분류다. */
  readonly items: readonly CategoryTab[];
  readonly selectedId: number;
  /** 고른 카테고리의 제품 목록. 탭 패널로 감싼다. */
  readonly children: ReactNode;
};

/**
 * 명세 APP · 카테고리 가로 트랙(S28). 밑줄 탭을 가로로 밀고, 탭마다 그 카테고리의 화면으로 가는 링크다.
 * 이동은 탭이, 필터는 칩이 맡는다. 그래서 이 화면의 칩 줄에는 카테고리 칩이 없다.
 *
 * 탭을 고르면 주소가 바뀌고(replace) 서버가 새 화면을 그린다. 링크가 이동을 맡으므로 onValueChange 는 기록만 남긴다.
 * 방향키로 옮겨도 같은 클릭이 일어나 기록과 이동이 함께 일어난다.
 */
export function CategoryTabs({ items, selectedId, children }: CategoryTabsProps) {
  const value = String(selectedId);

  const onValueChange = (next: string) => {
    const item = items.find((candidate) => String(candidate.id) === next);
    if (!item) return;
    track("category_selected", { category_id: item.id, category_name: item.name, origin_surface: "category" });
  };

  return (
    // 탭을 고르면 밑줄이 이전 탭에서 새 탭으로 미끄러진다. 탭 줄이 레이아웃에 있어 이동해도 다시 그려지지 않는다.
    <Tabs value={value} onValueChange={onValueChange} layout="scroll" slide>
      {/*
        트랙은 양옆에 거터를 둔다(LAYOUT L09). 첫 탭의 밑줄은 거터에서, 글자는 탭 안쪽 여백(12)만큼 더 들어가 시작한다(360 이상에서 16 · 28).
        글자는 명세대로 15(text-title)다. 부품 기본값(14)은 구성품 탭의 크기라 이 트랙만 링크에 크기를 얹는다.
      */}
      <TabList label="같은 분류의 카테고리">
        {items.map((item) => (
          <Tab key={item.id} value={String(item.id)} asChild>
            {/* 탭 사이 이동은 기록에 쌓지 않는다. 뒤로가기는 탭을 거슬러 가지 않고 이 화면에 들어오기 전으로 간다. */}
            <Link href={`/categories/${item.id}`} replace className="text-title">
              <TabLabel>{item.name}</TabLabel>
            </Link>
          </Tab>
        ))}
      </TabList>
      {/* 패널이 남은 화면을 채워야 그 안의 목록·빈 상태가 화면 끝까지 이어진다. */}
      <TabPanel value={value} className="flex flex-1 flex-col">
        {children}
      </TabPanel>
    </Tabs>
  );
}
