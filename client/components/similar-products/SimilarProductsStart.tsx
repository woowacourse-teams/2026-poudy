"use client";

import { Combobox, ComboboxInput, ComboboxList, ComboboxOption } from "@poudy/design-system/combobox";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { SimilarityShelf } from "./SimilarityShelf";

import { ProductImage } from "@/components/ui/ProductImage";
import { formatCount } from "@/lib/domain/format";
import { SIMILAR_PRODUCTS_PATH, similarProductsHref } from "@/lib/domain/similar-products";
import { useSimilarProductSearch } from "@/lib/hooks/useSimilarProductSearch";

export function SimilarProductsStart() {
  const router = useRouter();
  const keyword = useSearchParams().get("q") ?? "";
  const [composing, setComposing] = useState(false);
  const search = useSimilarProductSearch(keyword, composing);
  const changeKeyword = (next: string) => {
    const query = new URLSearchParams({ q: next });
    window.history.replaceState(null, "", next ? `${SIMILAR_PRODUCTS_PATH}?${query}` : SIMILAR_PRODUCTS_PATH);
  };
  const status = search.status === "ready" ? `검색 결과 ${formatCount(search.items.length)}` : "";

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6" aria-label="제품으로 유사템 찾기">
        <div className="flex flex-col gap-3">
          <h2 className="text-display font-bold text-text-primary">
            성분은 비슷한데
            <br />
            가격은 <span className="text-brand-text">절반</span>이라면?
          </h2>
          <p className="text-body text-text-secondary">저렴이부터 단종 제품의 대체품까지 찾아 드려요.</p>
        </div>
        <div>
          <Combobox
            value={keyword}
            onChange={changeKeyword}
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
                <ComboboxOption key={product.id} onSelect={() => router.push(similarProductsHref(product.id))}>
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
    </div>
  );
}
