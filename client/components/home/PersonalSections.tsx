"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { ProductCard } from "@/components/ui/ProductCard";
import { track } from "@/lib/analytics/track";
import { fetchStorage } from "@/lib/api/products";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import {
  getRecentFiltersServerSnapshot,
  getRecentFiltersSnapshot,
  subscribeRecentFilters,
} from "@/lib/storage/recent-filters";

/**
 * 홈에서 개인 데이터를 다루는 부분만 클라이언트로 떼어낸다.
 * 나머지 정적 영역은 서버가 그려 첫 화면이 빨리 보이게 한다.
 */

/** 디자인의 `방금 전 · 어제 · 3일 전` 표기. */
const relativeTime = (usedAt: number, now = Date.now()): string => {
  const minutes = Math.floor((now - usedAt) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "어제" : `${days}일 전`;
};

export function RecentFilters() {
  const recent = useSyncExternalStore(subscribeRecentFilters, getRecentFiltersSnapshot, getRecentFiltersServerSnapshot);

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[15px] font-bold text-text-primary">최근 검색</h2>

      {recent.length === 0 ? (
        <EmptyNotice icon="search" title="최근 검색이 없어요" detail="제품이나 성분을 찾아보면 여기에 남아요" />
      ) : null}

      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {recent.map((item, index) => (
          <li key={item.query} className="shrink-0">
            <Link
              href={`/products?${item.query}`}
              onClick={() =>
                track("recent_filter_used", {
                  mode: item.mode,
                  position: index,
                  age_minutes: Math.max(0, Math.floor((Date.now() - item.usedAt) / 60000)),
                })
              }
              className="flex w-[250px] flex-col gap-1.5 rounded-[10px] border border-border bg-background p-2.5"
            >
              <span className="flex items-center">
                <span className="inline-flex h-[22px] items-center gap-1 rounded-[11px] bg-surface px-[7px]">
                  <Icon name="search" size={12} className="text-text-secondary" />
                  <span className="text-[10px] font-semibold text-text-secondary">
                    {item.mode === "ingredient" ? "성분 필터링" : "제품명 검색"}
                  </span>
                </span>
              </span>

              <span className="text-[13px] font-semibold text-text-primary">{item.summary || "전체 제품"}</span>

              <span className="flex items-center justify-between">
                <span className="text-[10px] text-text-secondary">{relativeTime(item.usedAt)}</span>
                <Icon name="chevron-right" size={16} className="text-text-secondary" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 아직 쌓인 것이 없을 때도 자리를 남겨 무엇이 채워질지 알려 준다. */
function EmptyNotice({
  icon,
  title,
  detail,
}: {
  readonly icon: "search" | "bookmark";
  readonly title: string;
  readonly detail: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-surface px-4 py-6">
      <Icon name={icon} size={20} className="text-text-secondary" />
      <p className="text-[13px] font-semibold text-text-primary">{title}</p>
      <p className="text-[11px] text-text-secondary">{detail}</p>
    </div>
  );
}

export function SavedPreview() {
  const { savedIds, isSaved, toggle } = useSavedProducts();
  const key = savedIds.slice(0, 3).join(",");

  const onToggleSave = (productId: number) => {
    toggle(productId);
    track(isSaved(productId) ? "product_unsaved" : "product_saved", {
      product_id: productId,
      save_source: "home",
    });
  };
  const [items, setItems] = useState<readonly ProductResponse[]>([]);

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();
    fetchStorage(key.split(",").map(Number))
      .then((response) => {
        if (!controller.signal.aborted) setItems(response.items);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [key]);

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-text-primary">저장 제품</h2>
        {savedIds.length > 0 ? (
          <Link href="/saved" className="flex items-center gap-1">
            <span className="text-[13px] font-medium text-text-secondary">전체 보기</span>
            <Icon name="chevron-right" size={16} className="text-text-secondary" />
          </Link>
        ) : null}
      </div>

      {savedIds.length === 0 ? (
        <EmptyNotice
          icon="bookmark"
          title="저장한 제품이 없어요"
          detail="마음에 드는 제품을 저장해 두면 여기에 모여요"
        />
      ) : null}

      {/* 저장한 제품은 그 사람의 관심사라 세션 리플레이에서 가린다. */}
      <ul data-private className="divide-y divide-border">
        {items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} saved={isSaved(product.id)} onToggleSave={onToggleSave} />
          </li>
        ))}
      </ul>
    </section>
  );
}
