"use client";

import type { ProductSuggestionResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { fetchProductSuggestions } from "@/lib/api/products";
import { useSuggestions } from "@/lib/hooks/useSuggestions";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/storage/recent-searches";

const fetcher = async (keyword: string): Promise<readonly ProductSuggestionResponse[]> => {
  const response = await fetchProductSuggestions(keyword);
  return response.items;
};

/** S02 제품명 검색 탭. 문구는 design/v1.pen 을 따른다. */
export function ProductSearchPanel() {
  const [keyword, setKeyword] = useState("");
  const { items } = useSuggestions(keyword, fetcher);
  const typing = keyword.trim().length > 0;

  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <SearchField
          variant="outlined"
          value={keyword}
          onChange={setKeyword}
          placeholder="브랜드 또는 제품명을 입력해 주세요"
          label="제품명 검색"
        />
        <p className="text-[12px] text-text-secondary">
          {typing
            ? "검색어로 전체 목록을 보거나 제품을 바로 선택하세요."
            : "제품명을 입력하면 일치하는 제품을 바로 보여드려요."}
        </p>
      </div>

      {typing ? (
        <>
          <Link
            href={`/products?keyword=${encodeURIComponent(keyword.trim())}`}
            className="flex items-center gap-3 rounded-xl bg-surface p-3"
          >
            <Icon name="search" size={18} className="text-text-secondary" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-text-primary">‘{keyword.trim()}’가 포함된 제품 검색</span>
              <span className="text-[11px] text-text-secondary">검색 결과 전체 보기</span>
            </span>
            <Icon name="chevron-right" size={16} className="text-text-secondary" />
          </Link>

          <section>
            <h2 className="flex items-center gap-1.5 pb-2">
              <span className="text-[15px] font-bold text-text-primary">제품 바로가기</span>
              <span className="text-[12px] font-medium text-text-secondary">{items.length}개</span>
            </h2>

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
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-text-primary">{item.name}</span>
                      <span className="text-[11px] text-text-secondary">{item.brandName}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {items.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-text-secondary">검색 결과가 없어요.</p>
            ) : null}
          </section>

          <p className="text-[11px] text-text-secondary">검색어는 목록으로, 제품 선택은 상세 화면으로 이동해요.</p>
        </>
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
    <>
      <section>
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-[15px] font-bold text-text-primary">최근 검색</h2>
          <button type="button" onClick={clearRecentSearches} className="text-[12px] font-medium text-text-secondary">
            전체 삭제
          </button>
        </div>

        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-2 py-3">
              <Link href={`/products/${item.productId}`} className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-text-primary">{item.name}</span>
                <span className="text-[11px] text-text-secondary">{item.brandName}</span>
              </Link>
              <button
                type="button"
                onClick={() => removeRecentSearch(item.productId)}
                aria-label={`${item.name} 최근 검색에서 삭제`}
                className="flex size-8 items-center justify-center"
              >
                <Icon name="x" size={14} className="text-text-secondary" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-text-secondary">최근 선택한 제품을 다시 확인할 수 있어요.</p>
    </>
  );
}
