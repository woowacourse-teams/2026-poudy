"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { EmptyNotice } from "@/components/ui/EmptyNotice";
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

      {recent.length === 0 ? <EmptyNotice icon="search" title="최근 검색이 없어요" className="min-h-[110px]" /> : null}

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
              className="flex h-full w-[250px] flex-col gap-1.5 rounded-[10px] border border-border bg-background p-2.5"
            >
              <span className="flex items-center">
                <span className="inline-flex h-[22px] items-center gap-1 rounded-[11px] bg-surface px-[7px]">
                  <Icon name="search" size={12} className="text-text-secondary" />
                  {/* 행간이 남으면 글자가 알약 안에서 아래로 처져 보인다. */}
                  <span className="text-[10px] leading-none font-semibold text-text-secondary">
                    {item.mode === "ingredient" ? "성분 필터링" : "제품명 검색"}
                  </span>
                </span>
              </span>

              {/*
                조건이 길면 두 줄, `전체 제품` 처럼 짧으면 한 줄이 되어 카드마다 높이가
                달라진다. 가로로 늘어놓는 목록이라 아래가 들쭉날쭉하게 보인다.
                두 줄 자리를 늘 잡아 두어 요약 길이와 무관하게 높이를 맞춘다.
              */}
              <span className="line-clamp-2 min-h-[38px] text-[13px] font-semibold text-text-primary">
                {item.summary || "전체 제품"}
              </span>

              {/* 시각과 화살표는 카드 아래에 붙는다. 위 요약이 짧아도 자리가 밀리지 않는다. */}
              <span className="mt-auto flex items-center justify-between">
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

/** 홈에서 미리 보여 줄 저장 제품 수. 저장한 순서대로 앞에서 자른다. */
const SAVED_PREVIEW_COUNT = 2;

export function SavedPreview() {
  const { savedIds, isSaved, toggle } = useSavedProducts();
  // 홈은 맛보기 자리라 최근 저장한 둘만 보여 준다. 나머지는 전체 보기로 간다.
  const key = savedIds.slice(0, SAVED_PREVIEW_COUNT).join(",");

  const onToggleSave = (productId: number) => {
    toggle(productId);
    track(isSaved(productId) ? "product_unsaved" : "product_saved", {
      product_id: productId,
      save_source: "home",
    });
  };
  /*
   * 어느 조건으로 받은 응답인지 함께 들고 있는다. `items` 만 보면 아직 안 받은 것과
   * 받았는데 빈 것을 가릴 수 없어, 빈 안내를 띄울 때를 정하지 못한다.
   */
  const [loaded, setLoaded] = useState<{ readonly key: string; readonly items: readonly ProductResponse[] }>({
    key: "",
    items: [],
  });

  useEffect(() => {
    // 저장이 비면 불러올 것이 없다. 남아 있는 것은 아래에서 걸러 내므로 그대로 둔다.
    if (!key) return;

    const controller = new AbortController();
    fetchStorage(key.split(",").map(Number))
      .then((response) => {
        if (!controller.signal.aborted) setLoaded({ key, items: response.items });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [key]);

  const items = loaded.items;

  /*
   * 저장을 지우면 `savedIds` 는 그 자리에서 줄지만 `items` 는 다시 불러온 뒤에야 줄어든다.
   * 그 사이에 지운 카드가 화면에 남으므로, 지금 저장된 것만 남겨 걸러 낸다.
   * 마지막 하나를 지웠을 때는 다시 불러오지도 않으니 이 걸름이 카드를 지우는 유일한 길이다.
   */
  const visible = items.filter((product) => savedIds.includes(product.id)).slice(0, SAVED_PREVIEW_COUNT);

  /*
   * 저장해 둔 ID 는 있는데 아직 그 조건의 응답을 받지 못한 동안이다.
   * 이때 `저장한 제품이 없어요` 를 보여 주면 곧 카드가 뜨면서 문구가 번쩍인다.
   * 응답이 온 뒤에는 그 안이 비어 있어도(지워진 제품 등) 빈 상태로 정리된다.
   */
  const loading = key !== "" && loaded.key !== key;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-text-primary">저장 제품</h2>
        {visible.length > 0 ? (
          <Link href="/saved" className="flex items-center gap-1">
            <span className="text-[13px] font-medium text-text-secondary">전체 보기</span>
            <Icon name="chevron-right" size={16} className="text-text-secondary" />
          </Link>
        ) : null}
      </div>

      {visible.length === 0 && !loading ? (
        <EmptyNotice icon="bookmark" title="저장한 제품이 없어요" className="min-h-[110px]" />
      ) : null}

      {/* 저장한 제품은 그 사람의 관심사라 세션 리플레이에서 가린다. */}
      <ul data-private className="divide-y divide-divider">
        {visible.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} saved={isSaved(product.id)} onToggleSave={onToggleSave} entryPoint="home" />
          </li>
        ))}
      </ul>
    </section>
  );
}
