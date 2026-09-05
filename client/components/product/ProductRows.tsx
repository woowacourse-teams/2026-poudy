"use client";

import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { useEffect, useRef } from "react";

import { chipsOf } from "./product-chips";
import { ProductRowsSkeleton } from "./ProductListSkeleton";

import { FILTER_TYPES, FilterSheets, type SheetKind } from "@/components/filter/FilterSheets";
import { ProductCard } from "@/components/ui/ProductCard";
import { SortHeader } from "@/components/ui/SortHeader";
import type { ListSurface, SearchMode } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { Filter } from "@/lib/domain/filter";
import { countConditions } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { type InitialPage, useProductPages } from "@/lib/hooks/useProductPages";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import { ANCHOR_ATTRIBUTE } from "@/lib/navigation/scroll-anchor";

type ProductRowsProps = {
  readonly filter: Filter;
  readonly basePath: string;
  readonly surface: ListSurface;
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  readonly openSheet: SheetKind | undefined;
  readonly onCloseSheet: () => void;
  /** 서버가 받아 렌더링에 포함한 첫 장. */
  readonly initialPage?: InitialPage;
};

/** 조건에 걸린 말이 무엇인지. 분석 이벤트에만 쓴다. */
const searchModeOf = (filter: Filter): SearchMode | undefined => {
  if (filter.keyword) return "product";

  const ingredientCount =
    filter.includeIngredientIds.length + filter.excludeIngredientIds.length + filter.excludeCodes.length;
  if (ingredientCount > 0) return "ingredient";

  return undefined;
};

/**
 * 정렬 줄과 제품 행. 첫 장이 도착해야 그릴 수 있는 것만 모아 둔다.
 *
 * 필터 시트도 여기 있다. 시트는 지금 조건에 걸린 브랜드와 결과 개수를 쓰는데 둘 다
 * 목록 응답에서 나오고, 열리기 전에는 아무것도 그리지 않아 기다려도 손해가 없다.
 */
export function ProductRows({
  filter,
  basePath,
  surface,
  excludeCodes,
  openSheet,
  onCloseSheet,
  initialPage,
}: ProductRowsProps) {
  const { setCondition, setSort } = useFilterQuery(basePath);
  const { isSaved, toggle } = useSavedProducts();

  const {
    key,
    items,
    brands: matchedBrands,
    categories: matchedCategories,
    total,
    page,
    hasNext,
    loadNext,
    loading,
    loaded,
  } = useProductPages(filter, initialPage);
  const sentinel = useInfiniteScroll(hasNext && !loading, loadNext);

  const empty = items.length === 0 && !loading;
  const searchMode = searchModeOf(filter);
  const trackedResultKey = useRef<string | undefined>(undefined);

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

  useEffect(() => {
    if (!searchMode || !loaded || loading || page !== 0 || trackedResultKey.current === key) return;
    trackedResultKey.current = key;

    track("search_results_viewed", {
      mode: searchMode,
      ...(filter.keyword ? { query: filter.keyword } : {}),
      result_count: total,
      include_count: filter.includeIngredientIds.length,
      exclude_count: filter.excludeIngredientIds.length,
      exclude_group_count: filter.excludeCodes.length,
    });
  }, [filter, key, loaded, loading, page, searchMode, total]);

  // 첫 장은 화면 진입과 같으므로 세지 않는다. 이어 붙인 장만 탐색 깊이로 본다.
  useEffect(() => {
    if (page > 0 && !loading) track("product_list_scrolled", { surface, page, loaded_count: items.length });
    // 장이 늘었을 때만 남긴다. 같은 장에서 다시 그려도 보내지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading]);

  useEffect(() => {
    if (empty) track("empty_result_shown", { surface, condition_count: countConditions(filter) });
  }, [empty, surface, filter]);

  // 서버 응답이 없거나 조건을 바꿔 첫 장을 기다릴 때도 카드 자리를 유지한다.
  // 데이터가 오면 각 ProductCard가 자기 이미지 완료 상태로 독립적으로 열린다.
  if (loading && items.length === 0) return <ProductRowsSkeleton />;

  return (
    <>
      <div className="bg-white px-4">
        <SortHeader total={total} sort={filter.sort} onChangeSort={onChangeSort} />
      </div>

      <main className="flex-1 px-4">
        {empty ? (
          <p className="py-16 text-center text-[13px] text-text-secondary">조건에 맞는 제품이 없어요</p>
        ) : (
          <ul className="divide-y divide-divider">
            {items.map((product, index) => (
              // 되돌아왔을 때 보던 제품을 다시 찾는 표식이다.
              <li key={product.id} {...{ [ANCHOR_ATTRIBUTE]: product.id }}>
                <ProductCard
                  product={product}
                  saved={isSaved(product.id)}
                  onToggleSave={onToggleSave}
                  entryPoint={searchMode ? "search_results" : undefined}
                  imageLoading={index === 0 ? "eager" : "lazy"}
                />
              </li>
            ))}
          </ul>
        )}

        <div ref={sentinel} className="h-10" />
        {loading ? <p className="pb-6 text-center text-[13px] text-text-secondary">불러오는 중…</p> : null}
      </main>

      <FilterSheets
        openSheet={openSheet}
        onClose={onCloseSheet}
        filter={filter}
        onApply={(changed) => {
          setCondition(changed);
          if (openSheet) {
            track("filter_applied", {
              filter_type: FILTER_TYPES[openSheet],
              filter_value_count:
                chipsOf({ ...filter, ...changed }, excludeCodes).find((chip) => chip.id === openSheet)?.count ?? 0,
            });
          }
        }}
        categories={matchedCategories}
        brands={matchedBrands}
        excludeCodes={excludeCodes}
        initialCount={total}
      />
    </>
  );
}
