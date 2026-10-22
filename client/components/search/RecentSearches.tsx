"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { track } from "@/lib/analytics/track";
import {
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  type RecentSearch,
  recentSearchId,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/storage/recent-searches";

/** 제품은 그 상세로, 검색어는 그 말의 결과 목록으로 되돌아간다. */
const hrefOf = (item: RecentSearch) =>
  item.kind === "product"
    ? `/products/${item.productId}?from=recent_search`
    : `/products?keyword=${encodeURIComponent(item.keyword)}`;

const trackUse = (item: RecentSearch, position: number) =>
  track(
    "recent_search_used",
    item.kind === "product"
      ? { target_type: "product", position, product_id: item.productId }
      : { target_type: "keyword", position, query: item.keyword },
  );

/**
 * 최근 검색(명세 S21 '최근 검색어'). 기기에만 남아 있어 비어 있으면 섹션을 그리지 않는다.
 * 제품은 상자 아이콘과 '최근 본 제품 · 브랜드'로, 검색어는 돋보기로 무엇으로 되돌아가는지 가른다.
 */
export function RecentSearches() {
  const items = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );
  const clear = usePressable();

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-searches-title" className="flex flex-col pt-2 pb-5">
      <div className="flex h-9 items-center justify-between">
        <h2 id="recent-searches-title" className="text-section font-bold text-text-primary">
          최근 검색
        </h2>
        <button
          type="button"
          {...clear.pressableProps}
          onClick={clearRecentSearches}
          className="pressable fb-surface h-8 rounded-sm px-1 text-caption font-medium text-text-secondary after:absolute after:inset-x-0 after:-inset-y-1.5"
        >
          전체 삭제
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {items.map((item, index) => (
          <RecentSearchRow key={recentSearchId(item)} item={item} position={index} />
        ))}
      </ul>
    </section>
  );
}

function RecentSearchRow({ item, position }: { readonly item: RecentSearch; readonly position: number }) {
  const { pressableProps } = usePressable();
  const remove = usePressable();
  const label = item.kind === "product" ? item.name : item.keyword;

  return (
    // 링크에 올리거나 누르면 행 전체를 화면 끝에서 끝까지 칠한다. 면은 행의 가상 요소로 거터만큼 넓혀 그려 레이아웃은
    // 그대로다. ✕ 는 제 원 피드백만 쓰므로 링크가 반응할 때만 켠다.
    <li className="relative isolate flex items-center gap-1 before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-(--gutter) before:-z-10 before:transition-colors before:duration-(--duration-fast) has-[>a:is([data-hovered],[data-pressed])]:before:bg-hover">
      <Link
        href={hrefOf(item)}
        {...pressableProps}
        onClick={() => trackUse(item, position)}
        className="pressable flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2"
      >
        <span className="shrink-0 text-text-secondary">
          <Icon name={item.kind === "product" ? "archive" : "search"} size={16} scalable />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body font-medium text-text-primary">{label}</span>
          {item.kind === "product" ? (
            <span className="truncate text-caption text-text-secondary">최근 본 제품 · {item.brandName}</span>
          ) : null}
        </span>
      </Link>
      {/* 명세의 ✕ 는 16 이라 아이콘을 24 로 키우는 IconButton 대신 같은 44 영역과 원 피드백을 쓴다. */}
      <button
        type="button"
        aria-label={`${label} 최근 검색에서 삭제`}
        {...remove.pressableProps}
        onClick={() => removeRecentSearch(recentSearchId(item))}
        className="pressable fb-circle flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary"
      >
        <Icon name="x" size={16} className="relative" />
      </button>
    </li>
  );
}
