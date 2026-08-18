"use client";

import type { ProductSuggestionResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { SearchField } from "@/components/ui/SearchField";
import { fetchProductSuggestions } from "@/lib/api/products";
import { useSuggestions } from "@/lib/hooks/useSuggestions";
import {
  addRecentSearch,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/storage/recent-searches";

const fetcher = async (keyword: string): Promise<readonly ProductSuggestionResponse[]> => {
  const response = await fetchProductSuggestions(keyword);
  return response.items;
};

/** S02 제품명 검색 탭. 자동완성과 최근 검색을 보여 준다. */
export function ProductSearchPanel() {
  const [keyword, setKeyword] = useState("");
  const { items } = useSuggestions(keyword, fetcher);

  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <SearchField
        value={keyword}
        onChange={setKeyword}
        placeholder="제품명이나 브랜드를 검색하세요"
        label="제품명 검색"
      />

      {keyword.trim() ? (
        <section>
          <h2 className="pb-2 text-[13px] font-semibold text-text-secondary">제품 {items.length}건</h2>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/products/${item.id}`}
                  onClick={() =>
                    addRecentSearch({
                      productId: item.id,
                      name: item.name,
                      brandName: item.brandName,
                    })
                  }
                  className="flex items-center gap-3 py-3"
                >
                  <span className="size-10 shrink-0 rounded-lg bg-surface" />
                  <span className="flex flex-1 flex-col">
                    <span className="text-[14px] text-text-primary">{item.name}</span>
                    <span className="text-[12px] text-text-secondary">{item.brandName}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-text-secondary">검색 결과가 없어요.</p>
          ) : null}
        </section>
      ) : (
        <RecentSearches items={recent} />
      )}
    </div>
  );
}

function RecentSearches({
  items,
}: {
  readonly items: readonly { productId: number; name: string; brandName: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="pb-2 text-[13px] font-semibold text-text-secondary">최근 검색</h2>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-2 py-3">
            <Link href={`/products/${item.productId}`} className="flex flex-1 flex-col">
              <span className="text-[14px] text-text-primary">{item.name}</span>
              <span className="text-[12px] text-text-secondary">{item.brandName}</span>
            </Link>
            <button
              type="button"
              onClick={() => removeRecentSearch(item.productId)}
              aria-label={`${item.name} 최근 검색에서 삭제`}
              className="flex size-8 items-center justify-center text-text-secondary"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
