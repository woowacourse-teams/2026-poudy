"use client";

import type { BrandListItemResponse, CategoryResponse, ExcludeCodeResponse, ProductResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useRef, useState } from "react";

import { FilterSheets, type SheetKind } from "@/components/filter/FilterSheets";
import { FilterChipBar, type FilterChipItem } from "@/components/ui/FilterChipBar";
import { ProductCard } from "@/components/ui/ProductCard";
import { SortHeader } from "@/components/ui/SortHeader";
import type { FilterType } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { fetchProducts } from "@/lib/api/products";
import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import { countConditions, summarizeFilter } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";

type ProductListProps = {
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandListItemResponse[];
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  /** 조건을 어느 주소에 쓸지. 브랜드 상세는 자기 주소에 남긴다. */
  readonly basePath?: string;
  /** 화면이 고정하는 조건. 브랜드 상세의 브랜드처럼 사용자가 바꾸지 않는 값이다. */
  readonly fixedFilter?: Partial<Filter>;
  /** 고정한 조건에 해당하는 칩은 숨긴다. */
  readonly hiddenChips?: readonly string[];
};

/** 칩 id 를 분석 이벤트의 filter_type 으로 옮긴다. */
const FILTER_TYPES: Record<SheetKind, FilterType> = {
  ingredient: "ingredient",
  category: "category",
  brand: "brand",
  level: "moisture_oil",
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
export function ProductList({
  categories,
  brands,
  excludeCodes,
  basePath = "/products",
  fixedFilter,
  hiddenChips = [],
}: ProductListProps) {
  const { filter: urlFilter, setCondition, setSort } = useFilterQuery(basePath);
  const { isSaved, toggle } = useSavedProducts();
  const [openSheet, setOpenSheet] = useState<SheetKind>();

  const onToggleSave = (productId: number) => {
    toggle(productId);
    track(isSaved(productId) ? "product_unsaved" : "product_saved", {
      product_id: productId,
      save_source: "product_list",
    });
  };

  const onChangeSort = (sort: Filter["sort"]) => {
    setSort(sort);
    track("sort_applied", { sort });
  };

  // 고정 조건은 URL 조건 위에 덮어써서 사용자가 지울 수 없게 한다.
  const filter = { ...urlFilter, ...fixedFilter };

  const { items, total, hasNext, loadNext, loading } = useProductPages(filter);
  const sentinel = useInfiniteScroll(hasNext && !loading, loadNext);

  return (
    <>
      {/* 화면이 고정한 조건은 제목과 탭이 이미 알려 주므로 요약에서 뺀다(디자인 S09·S11). */}
      <FilterSummary filter={{ ...filter, ...blankFilter(fixedFilter) }} />

      <div className="bg-white px-4">
        <FilterChipBar
          chips={chipsOf(filter).filter((chip) => !hiddenChips.includes(chip.id))}
          onOpen={(id) => setOpenSheet(id as SheetKind)}
        />
        <SortHeader total={total} sort={filter.sort} onChangeSort={onChangeSort} />
      </div>

      <main className="flex-1 px-4">
        {items.length === 0 && !loading ? (
          <p className="py-16 text-center text-[13px] text-text-secondary">조건에 맞는 제품이 없어요</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} saved={isSaved(product.id)} onToggleSave={onToggleSave} />
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
        onApply={(changed) => {
          setCondition(changed);
          if (openSheet) {
            track("filter_applied", {
              filter_type: FILTER_TYPES[openSheet],
              filter_value_count: chipsOf({ ...filter, ...changed }).find((chip) => chip.id === openSheet)?.count ?? 0,
              result_count: total,
            });
          }
        }}
        categories={categories}
        brands={brands}
        excludeCodes={excludeCodes}
      />
    </>
  );
}

/**
 * 화면이 고정한 조건만 빈 값으로 되돌린다.
 * 사용자가 고른 조건이 아니라서 `탐색 조건` 요약에 세지 않는다.
 */
const blankFilter = (fixed: Partial<Filter> = {}): Partial<Filter> =>
  Object.fromEntries(Object.keys(fixed).map((key) => [key, EMPTY_FILTER[key as keyof Filter]]));

/** 디자인의 `탐색 조건` 요약. 지금 걸린 조건을 읽기 전용으로 보여 준다. */
function FilterSummary({ filter }: { readonly filter: Filter }) {
  // 조건에는 ID 만 남으므로 성분 이름은 서버에서 가져온다.
  const names = useIngredientNames([...filter.includeIngredientIds, ...filter.excludeIngredientIds]);
  const count = countConditions(filter);
  if (count === 0) return null;

  return (
    <section className="flex flex-col gap-1 px-4 py-2">
      <div className="flex items-center gap-1.5">
        <h2 className="text-[13px] font-bold text-[#212124]">탐색 조건</h2>
        <span className="rounded-full bg-[#F2F3F6] px-[7px] text-[11px] font-bold text-[#555D68]">{count}</span>
      </div>
      <p className="text-[12px] text-[#767B83]">{summarizeFilter(filter, names)}</p>
    </section>
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
