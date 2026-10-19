"use client";

import type { IngredientGroupResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { LoadMore } from "@poudy/design-system/load-more";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";

import { chipsOf } from "./product-chips";
import { ProductRowsSkeleton } from "./ProductListSkeleton";

import { FILTER_TYPES, FilterSheets, type SheetKind } from "@/components/filter/FilterSheets";
import { Icon } from "@/components/ui/icons/Icon";
import { ProductCard } from "@/components/ui/ProductCard";
import { SortHeader } from "@/components/ui/SortHeader";
import type { ListSurface, ProductEntryPoint, ProductListSource, SearchMode } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { FIRST_PAGE, type Filter, serializeFilter, skinChoiceOf } from "@/lib/domain/filter";
import { countConditions } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { type InitialPage, useProductPages } from "@/lib/hooks/useProductPages";
import { ANCHOR_ATTRIBUTE, holdAnchor } from "@/lib/navigation/scroll-anchor";

type ProductRowsProps = {
  readonly filter: Filter;
  readonly basePath: string;
  readonly surface: ListSurface;
  readonly entryPoint?: ProductEntryPoint;
  readonly excludeCodes: readonly IngredientGroupResponse[];
  readonly openSheet: SheetKind | undefined;
  readonly onCloseSheet: () => void;
  /** 서버가 받아 렌더링에 포함한 첫 장. */
  readonly initialPage?: InitialPage;
  /**
   * 결과가 0개일 때 그릴 빈 상태(FEEDBACK F03). 화면마다 문구가 달라 반드시 넘긴다. 컴포넌트는 그 화면의 경로 옆
   * `empty.tsx` 에 둔다(예: `app/products/empty.tsx`).
   */
  readonly empty: ReactNode;
};

/** 조건에 걸린 말이 무엇인지. 분석 이벤트에만 쓴다. */
const searchModeOf = (filter: Filter): SearchMode | undefined => {
  if (filter.keyword) return "product";

  const ingredientCount =
    filter.includeIngredientIds.length +
    filter.excludeIngredientIds.length +
    filter.excludeCodes.length +
    filter.includeGroupCodes.length +
    filter.excludeGroupCodes.length;
  if (ingredientCount > 0) return "ingredient";

  return undefined;
};

/**
 * 같은 조건의 다른 장 주소. 1 페이지는 `page` 를 남기지 않는다.
 * 크롤러는 스크롤하지 않으므로 이 주소를 따라가야 뒤쪽 장의 제품에 닿는다.
 */
const pageHref = (basePath: string, filter: Filter, page: number): string => {
  const query = serializeFilter({ ...filter, page }).toString();
  if (!query) return basePath;
  return `${basePath}?${query}`;
};

const previousStatus = (loading: boolean, failed: boolean) => {
  if (loading) return "loading";
  if (failed) return "failed";
  return "idle";
};

const nextStatus = (hasNext: boolean, loading: boolean, failed: boolean) => {
  if (failed) return "failed";
  if (loading) return "loading";
  return hasNext ? "idle" : "end";
};

/**
 * 정렬 줄과 제품 행. 첫 장이 도착해야 그릴 수 있는 것만 모아 둔다.
 *
 * 필터 시트도 여기 있다. 시트의 후보와 결과 개수는 같은 목록 응답에서 받는다.
 */
export function ProductRows({
  filter,
  basePath,
  surface,
  entryPoint: requestedEntryPoint,
  excludeCodes,
  openSheet,
  onCloseSheet,
  initialPage,
  empty: emptyState,
}: ProductRowsProps) {
  const router = useRouter();
  const { filter: urlFilter, setCondition, setSort } = useFilterQuery(basePath);

  const {
    key,
    items,
    filterOptions,
    total,
    first,
    page,
    hasNext,
    loadNext,
    loadPrevious,
    loading,
    loadingPrevious,
    previousFailed,
    loaded,
    failed,
    retry,
  } = useProductPages(filter, initialPage);
  const restoreAnchor = useRef<() => void>(undefined);

  // 받지 못한 것을 없는 것으로 말하지 않는다. 비었다고 할 수 있는 것은 받은 뒤뿐이다.
  const empty = loaded && items.length === 0 && !loading;
  const searchMode = searchModeOf(filter);
  const entryPoint: ProductEntryPoint = requestedEntryPoint ?? (searchMode === undefined ? surface : "search_results");
  const listSource: ProductListSource =
    entryPoint === "popular_keyword" || entryPoint === "skin_type" ? entryPoint : surface;
  const trackedResultKey = useRef<string | undefined>(undefined);

  // 마지막 장을 넘어선 주소면 앞쪽 링크가 빈 장을 하나씩 거슬러 오르지 않고 마지막 장으로 간다.
  const previousPage = Math.min(first - 1, Math.max(FIRST_PAGE, Math.ceil(total / filter.size)));
  const previousHref = pageHref(basePath, urlFilter, previousPage);

  /*
   * 앞쪽 장은 버튼을 눌러야만 부른다. 주소를 옮기지 않고 위에 붙이며, 보던 제품이 그만큼 밀려 내려가므로 붙인 뒤
   * 같은 자리로 되돌린다. 마지막 장을 넘어선 주소로 들어와 목록이 비었으면 붙일 자리가 없으니 그 주소로 옮겨 간다.
   */
  const onLoadPrevious = () => {
    if (items.length === 0) {
      router.push(previousHref);
      return;
    }
    if (loadingPrevious) return;
    restoreAnchor.current = holdAnchor(items[0].id);
    loadPrevious();
  };

  useLayoutEffect(() => {
    restoreAnchor.current?.();
    restoreAnchor.current = undefined;
  }, [first]);

  const onChangeSort = (sort: Filter["sort"]) => {
    setSort(sort);
    track("sort_applied", { sort });
  };

  useEffect(() => {
    if (!loaded || loading || page !== first || trackedResultKey.current === key) return;
    trackedResultKey.current = key;

    if (searchMode && requestedEntryPoint !== "popular_keyword") {
      track("search_results_viewed", {
        mode: searchMode,
        ...(filter.keyword ? { query: filter.keyword } : {}),
        result_count: total,
        include_count: filter.includeIngredientIds.length,
        exclude_count: filter.excludeIngredientIds.length,
        exclude_group_count: filter.excludeCodes.length,
      });
      return;
    }

    track("product_list_viewed", {
      source: listSource,
      result_count: total,
      condition_count: countConditions(filter) + (skinChoiceOf(filter) ? 1 : 0),
    });
  }, [filter, first, key, listSource, loaded, loading, page, requestedEntryPoint, searchMode, total]);

  // 시작한 장은 화면 진입과 같으므로 세지 않는다. 이어 붙인 장만 탐색 깊이로 본다.
  useEffect(() => {
    if (page > first && !loading) track("product_list_scrolled", { surface, page, loaded_count: items.length });
    // 장이 늘었을 때만 남긴다. 같은 장에서 다시 그려도 보내지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading]);

  useEffect(() => {
    if (empty) track("empty_result_shown", { surface, condition_count: countConditions(filter) });
  }, [empty, surface, filter]);

  // 서버 응답이 없거나 조건을 바꿔 첫 장을 기다릴 때도 카드 자리를 유지한다.
  // 데이터가 오면 각 ProductCard가 자기 이미지 완료 상태로 독립적으로 열린다.
  if (loading && items.length === 0) return <ProductRowsSkeleton />;
  if (failed && !loaded) {
    // 받지 못한 것을 없는 것으로 말하지 않는다. 화면 오류(S51)와 같은 모양으로 다시 시도하게 한다.
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="info" size={28} />}
          title="제품을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="secondary" onClick={retry}>
              다시 시도
            </Button>
          }
          className="flex-1"
        />
      </main>
    );
  }

  return (
    <>
      <div className="bg-white px-4">
        <SortHeader total={total} sort={filter.sort} onChangeSort={onChangeSort} />
      </div>

      <main className="flex-1 px-4">
        {/* 주소의 `?page=N` 으로 중간 장부터 들어온 사람이 앞쪽 장으로 돌아갈 길이다. 링크는 크롤러가 따라간다. */}
        {first > FIRST_PAGE ? (
          <LoadMore
            direction="previous"
            status={previousStatus(loadingPrevious, previousFailed)}
            onLoad={onLoadPrevious}
            href={previousHref}
          />
        ) : null}

        {empty ? (
          emptyState
        ) : (
          <ul aria-busy={loading || undefined} className="divide-y divide-border">
            {items.map((product, index) => (
              // 되돌아왔을 때 보던 제품을 다시 찾는 표식이다.
              <li key={product.id} {...{ [ANCHOR_ATTRIBUTE]: product.id }}>
                <ProductCard product={product} entryPoint={entryPoint} imageLoading={index === 0 ? "eager" : "lazy"} />
              </li>
            ))}
          </ul>
        )}

        {/* 다음 장은 목록 끝이 보이면 저절로 부르고, 실패하면 버튼을 눌러야만 다시 부른다. 링크는 크롤러가 따라간다. */}
        {hasNext || !empty ? (
          <LoadMore
            direction="next"
            status={nextStatus(hasNext, loading, failed)}
            loadedCount={items.length}
            totalCount={total}
            onLoad={loadNext}
            onRetry={retry}
            href={pageHref(basePath, urlFilter, page + 1)}
          />
        ) : null}
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
        categories={filterOptions?.categories ?? []}
        brands={filterOptions?.brands ?? []}
        skinTypes={filterOptions?.skinTypes ?? []}
        optionsPageHref={filterOptions === undefined ? pageHref(basePath, urlFilter, FIRST_PAGE) : undefined}
        excludeCodes={excludeCodes}
        initialCount={total}
      />
    </>
  );
}
