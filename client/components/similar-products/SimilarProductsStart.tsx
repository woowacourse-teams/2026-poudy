"use client";

import { Combobox, ComboboxInput, ComboboxList, ComboboxOption } from "@poudy/design-system/combobox";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PopularDupes } from "./PopularDupes";
import { SimilarityShelf } from "./SimilarityShelf";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { ProductImage } from "@/components/ui/ProductImage";
import { selectSimilarSource } from "@/lib/analytics/similar-products";
import { formatCount } from "@/lib/domain/format";
import type { PopularDupe } from "@/lib/domain/popular-dupes";
import { SIMILAR_PRODUCTS_PATH, similarProductsHref } from "@/lib/domain/similar-products";
import { useSimilarProductSearch } from "@/lib/hooks/useSimilarProductSearch";

export function SimilarProductsStart({ popularDupes }: { readonly popularDupes: readonly PopularDupe[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [keyword, setKeyword] = useState(() => params.get("q") ?? "");
  const [composing, setComposing] = useState(false);
  const search = useSimilarProductSearch(keyword, composing);
  const rememberKeyword = () => {
    const query = new URLSearchParams({ q: keyword.trim() });
    window.history.replaceState(null, "", keyword.trim() ? `${SIMILAR_PRODUCTS_PATH}?${query}` : SIMILAR_PRODUCTS_PATH);
  };
  // 입력값은 React 상태로 유지한다. 기존 검색 화면처럼 입력이 멈춘 값만 주소에 남긴다.
  useEffect(() => {
    if (composing || search.keyword !== keyword.trim()) return;
    const query = new URLSearchParams({ q: search.keyword });
    window.history.replaceState(null, "", search.keyword ? `${SIMILAR_PRODUCTS_PATH}?${query}` : SIMILAR_PRODUCTS_PATH);
  }, [composing, keyword, search.keyword]);
  useTrackedView(
    "similar_search_results_viewed",
    { query_length: search.keyword.length, displayed_count: search.items.length },
    {
      key: `${search.keyword}:${search.items.map((p) => p.id).join(",")}`,
      enabled: search.status === "ready" && !composing && search.keyword === keyword.trim(),
    },
  );
  const status = search.status === "ready" ? `검색 결과 ${formatCount(search.items.length)}` : "";

  return (
    <div className="flex flex-col gap-10 pb-inquiry">
      <section className="flex flex-col gap-6" aria-label="제품으로 유사템 찾기">
        <h2 className="text-display font-bold text-text-primary">
          성분은 비슷한데
          <br />
          가격은 <span className="text-brand-text">절반</span>이라면?
        </h2>
        <div>
          <Combobox
            value={keyword}
            onChange={setKeyword}
            open={search.status === "ready" && search.items.length > 0}
            status={status}
          >
            <ComboboxInput
              label="유사템 기준 제품 검색"
              placeholder="찾고 싶은 제품 이름을 입력해 주세요"
              onChangeComposing={setComposing}
            />
            <ComboboxList label="제품 검색 결과">
              {search.items.map((product) => (
                <ComboboxOption
                  key={product.id}
                  onSelect={() => {
                    rememberKeyword();
                    selectSimilarSource(product.id, "search");
                    router.push(similarProductsHref(product.id));
                  }}
                >
                  <span className="flex items-center gap-3 py-3">
                    <ProductImage src={product.imageUrl} size={48} className="shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-caption text-text-secondary">{product.brandName}</span>
                      <span className="text-title font-medium text-text-primary">{product.name}</span>
                    </span>
                  </span>
                </ComboboxOption>
              ))}
            </ComboboxList>
          </Combobox>
          {search.status === "loading" ? (
            <p role="status" className="py-4 text-body-sm text-text-secondary">
              제품을 찾고 있어요
            </p>
          ) : null}
          {search.status === "error" ? (
            <ErrorState variant="section" onRetry={search.retry}>
              검색 결과를 불러오지 못했어요
            </ErrorState>
          ) : null}
          {search.status === "ready" && search.items.length === 0 ? (
            <EmptyState title="검색한 제품이 없어요" description="브랜드나 제품 이름을 다시 확인해 주세요." />
          ) : null}
        </div>
      </section>
      <SimilarityShelf />
      <PopularDupes items={popularDupes} />
    </div>
  );
}
