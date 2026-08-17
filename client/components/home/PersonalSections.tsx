"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ProductCard } from "@/components/ui/ProductCard";
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
export function RecentFilters() {
  const recent = useSyncExternalStore(subscribeRecentFilters, getRecentFiltersSnapshot, getRecentFiltersServerSnapshot);

  if (recent.length === 0) return null;

  return (
    <section className="border-t-8 border-surface px-4 py-5">
      <h2 className="pb-3 text-[16px] font-bold text-text-primary">최근 탐색 조건</h2>
      <ul className="flex gap-2 overflow-x-auto">
        {recent.map((item) => (
          <li key={item.query} className="shrink-0">
            <Link
              href={`/products?${item.query}`}
              className="flex w-[200px] flex-col gap-2 rounded-xl border border-border p-3"
            >
              <span className="text-[13px] text-text-primary">{item.summary || "전체 제품"}</span>
              <span className="text-[11px] text-text-secondary">
                {new Date(item.usedAt).toLocaleDateString("ko-KR")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SavedPreview() {
  const { savedIds, isSaved, toggle } = useSavedProducts();
  const key = savedIds.slice(0, 3).join(",");
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

  if (savedIds.length === 0) return null;

  return (
    <section className="border-t-8 border-surface px-4 py-5">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-[16px] font-bold text-text-primary">저장한 제품</h2>
        <Link href="/saved" className="text-[13px] text-text-secondary">
          전체 보기
        </Link>
      </div>

      <ul className="divide-y divide-border">
        {items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} saved={isSaved(product.id)} onToggleSave={toggle} />
          </li>
        ))}
      </ul>
    </section>
  );
}
