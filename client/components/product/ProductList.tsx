"use client";

import type { BrandListItemResponse, CategoryResponse, ExcludeCodeResponse, ProductResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useRef, useState } from "react";

import { FilterSheets, type SheetKind } from "@/components/filter/FilterSheets";
import { FilterChipBar, type FilterChipItem } from "@/components/ui/FilterChipBar";
import { ProductCard } from "@/components/ui/ProductCard";
import { SortHeader } from "@/components/ui/SortHeader";
import { fetchProducts } from "@/lib/api/products";
import type { Filter } from "@/lib/domain/filter";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";

type ProductListProps = {
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandListItemResponse[];
  readonly excludeCodes: readonly ExcludeCodeResponse[];
};

const chipsOf = (filter: Filter): readonly FilterChipItem[] => [
  {
    id: "ingredient",
    label: "성분",
    count: filter.excludeCodes.length + filter.excludeIngredientIds.length,
  },
  { id: "category", label: "카테고리", count: filter.categoryIds.length },
  { id: "brand", label: "브랜드", count: filter.brandIds.length },
  {
    id: "level",
    label: "유수분",
    count: (filter.moistureLevel.length > 0 ? 1 : 0) + (filter.oilLevel.length > 0 ? 1 : 0),
  },
];

/** S04 조건 일치 제품. 조건은 URL 이 들고, 목록은 페이지를 이어 붙인다. */
export function ProductList({ categories, brands, excludeCodes }: ProductListProps) {
  const { filter, setCondition, setSort } = useFilterQuery("/products");
  const { isSaved, toggle } = useSavedProducts();
  const [openSheet, setOpenSheet] = useState<SheetKind>();

  const { items, total, hasNext, loadNext, loading } = useProductPages(filter);
  const sentinel = useInfiniteScroll(hasNext && !loading, loadNext);

  return (
    <>
      <div className="sticky top-0 z-10 bg-white px-4 pt-2">
        <FilterChipBar chips={chipsOf(filter)} onOpen={(id) => setOpenSheet(id as SheetKind)} />
        <SortHeader total={total} sort={filter.sort} onChangeSort={setSort} />
      </div>

      <main className="flex-1 px-4">
        {items.length === 0 && !loading ? (
          <p className="py-16 text-center text-[14px] text-text-secondary">
            조건에 맞는 제품이 없어요. 조건을 줄여 보세요.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} saved={isSaved(product.id)} onToggleSave={toggle} />
              </li>
            ))}
          </ul>
        )}

        <div ref={sentinel} className="h-10" />
        {loading ? <p className="pb-6 text-center text-[13px] text-text-secondary">불러오는 중…</p> : null}
      </main>

      <FilterSheets
        openSheet={openSheet}
        onClose={() => setOpenSheet(undefined)}
        filter={filter}
        onApply={setCondition}
        categories={categories}
        brands={brands}
        excludeCodes={excludeCodes}
      />
    </>
  );
}

type PageState = {
  readonly key: string;
  readonly page: number;
  readonly items: readonly ProductResponse[];
  readonly total: number;
  readonly hasNext: boolean;
  readonly loading: boolean;
};

const EMPTY_PAGE_STATE: Omit<PageState, "key"> = {
  page: 0,
  items: [],
  total: 0,
  hasNext: false,
  loading: true,
};

/** 조건이 바뀌면 목록을 처음부터 다시 쌓는다. */
function useProductPages(filter: Filter) {
  const key = JSON.stringify({ ...filter, page: 0 });
  const [state, setState] = useState<PageState>({ ...EMPTY_PAGE_STATE, key });

  // 조건이 바뀌면 렌더링 중에 목록을 비운다. effect 에서 되돌리면 한 번 더 그리게 된다.
  const current = state.key === key ? state : { ...EMPTY_PAGE_STATE, key };
  if (state.key !== key) setState(current);

  const { page } = current;

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts({ ...JSON.parse(key), page })
      .then((response) => {
        if (controller.signal.aborted) return;
        setState((previous) => {
          if (previous.key !== key) return previous;
          return {
            ...previous,
            // 첫 페이지는 갈아 끼우고 다음 페이지는 이어 붙인다.
            items: page === 0 ? response.items : [...previous.items, ...response.items],
            total: response.pagination.totalElements,
            hasNext: response.pagination.hasNext,
            loading: false,
          };
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.key === key ? { ...previous, loading: false } : previous));
      });

    return () => controller.abort();
  }, [key, page]);

  const loadNext = useCallback(() => {
    setState((previous) => ({ ...previous, page: previous.page + 1, loading: true }));
  }, []);

  return { ...current, loadNext };
}

/** 목록 끝이 보이면 다음 페이지를 부른다. */
function useInfiniteScroll(enabled: boolean, onReach: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target || !enabled) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onReach();
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, onReach]);

  return ref;
}
