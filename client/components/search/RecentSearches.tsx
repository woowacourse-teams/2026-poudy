"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useSyncExternalStore } from "react";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
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
  item.kind === "product" ? `/products/${item.productId}` : `/products?keyword=${encodeURIComponent(item.keyword)}`;

const trackUse = (item: RecentSearch, position: number) =>
  track(
    "recent_search_used",
    item.kind === "product"
      ? { target_type: "product", position, product_id: item.productId }
      : { target_type: "keyword", position, query: item.keyword },
  );

type RecentSearchesProps = {
  /**
   * 행을 눌렀을 때 다른 화면으로 가지 않고 이 화면에서 처리한다(유사템 시작 S272: 그 말로 다시 검색).
   * 넘기지 않으면 제품은 상세로, 검색어는 결과 목록으로 간다. 모양은 같다.
   */
  readonly onSelect?: (item: RecentSearch) => void;
};

/**
 * 최근 검색(명세 S21 '최근 검색어'). 기기에만 남아 있어 비어 있으면 섹션을 그리지 않는다.
 * 제품은 상자 아이콘과 '최근 본 제품 · 브랜드'로, 검색어는 돋보기로 무엇으로 되돌아가는지 가른다.
 */
export function RecentSearches({ onSelect }: RecentSearchesProps = {}) {
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
          <RecentSearchRow key={recentSearchId(item)} item={item} position={index} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}

function RecentSearchRow({
  item,
  position,
  onSelect,
}: {
  readonly item: RecentSearch;
  readonly position: number;
  readonly onSelect?: (item: RecentSearch) => void;
}) {
  const { pressableProps } = usePressable();
  const remove = usePressable();
  const label = item.kind === "product" ? item.name : item.keyword;
  const body = (
    <>
      <span className="shrink-0 text-text-secondary">
        <Icon name={item.kind === "product" ? "archive" : "search"} size={16} scalable />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-medium text-text-primary">{label}</span>
        {item.kind === "product" ? (
          <span className="truncate text-caption text-text-secondary">최근 본 제품 · {item.brandName}</span>
        ) : null}
      </span>
    </>
  );

  return (
    // 행(링크 또는 onSelect 의 버튼)에 올리거나 누르면 행 전체를 화면 끝에서 끝까지 칠한다. 면은 행의 가상 요소로 거터만큼 넓혀 그려 레이아웃은
    // 그대로다. ✕ 는 제 원 피드백만 쓰므로 행이 반응할 때만 켠다.
    <li className="relative isolate flex items-center gap-1 before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-(--gutter) before:-z-10 before:transition-colors before:duration-(--duration-fast) has-[>[data-recent-row]:is([data-hovered],[data-pressed])]:before:bg-hover">
      {onSelect ? (
        <button
          type="button"
          data-recent-row=""
          {...pressableProps}
          onClick={() => {
            trackUse(item, position);
            onSelect(item);
          }}
          className="pressable flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2 text-left"
        >
          {body}
        </button>
      ) : (
        <Link
          href={hrefOf(item)}
          entryPoint={item.kind === "product" ? "recent_search" : undefined}
          data-recent-row=""
          {...pressableProps}
          onClick={() => trackUse(item, position)}
          className="pressable flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2"
        >
          {body}
        </Link>
      )}
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
