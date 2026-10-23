"use client";

import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { LoadMore } from "@poudy/design-system/load-more";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";

import { pageHref } from "./page-href";
import { ProductRowsSkeleton } from "./ProductListSkeleton";

import { ProductCard } from "@/components/ui/ProductCard";
import { SortHeader } from "@/components/ui/SortHeader";
import { productEntryPointOf } from "@/lib/analytics/events";
import type { ListSurface, ProductEntryPoint, ProductListSource, SearchMode } from "@/lib/analytics/events";
import { readPageEntry } from "@/lib/analytics/page-entry";
import { track } from "@/lib/analytics/track";
import { FIRST_PAGE, type Filter, skinChoicesOf } from "@/lib/domain/filter";
import { countConditions } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { isEmptyResult, type useProductPages } from "@/lib/hooks/useProductPages";
import { ANCHOR_ATTRIBUTE, holdAnchor } from "@/lib/navigation/scroll-anchor";

type ProductRowsProps = {
  readonly filter: Filter;
  readonly basePath: string;
  readonly surface: ListSurface;
  readonly entryPoint?: ProductEntryPoint;
  /** 목록이 받은 장. 칩 줄도 같은 응답의 필터 후보를 쓰므로 목록이 한 번만 받아 넘긴다. */
  readonly pages: ReturnType<typeof useProductPages>;
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
 * 결과 수와 상품 목록 카드. 첫 장이 도착해야 그릴 수 있는 것만 모아 둔다.
 * 정렬은 MVP 에서 뺐다(명세 APP · 목록 결과 헤더, 2026-10-14). 주소에 남은 정렬은 그대로 요청에 쓴다.
 */
export function ProductRows({
  filter,
  basePath,
  surface,
  entryPoint: requestedEntryPoint,
  pages,
  empty: emptyState,
}: ProductRowsProps) {
  const router = useRouter();
  const { filter: urlFilter, setSort } = useFilterQuery(basePath);
  const onChangeSort = (sort: Filter["sort"]) => {
    setSort(sort);
    track("sort_applied", { sort });
  };

  const {
    key,
    items,
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
  } = pages;
  const restoreAnchor = useRef<() => void>(undefined);

  const empty = isEmptyResult(pages);
  const searchMode = searchModeOf(filter);
  const savedEntry = readPageEntry();
  const entryPoint: ProductEntryPoint =
    requestedEntryPoint ??
    (savedEntry ? productEntryPointOf(savedEntry) : undefined) ??
    (searchMode === undefined ? surface : "search_results");
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

  // 앞쪽 장을 붙인 뒤 그려진 화면에서 보던 제품의 자리를 되돌린다. 칠하기 전에 맞춰야 튀어 보이지 않는다.
  useLayoutEffect(() => {
    restoreAnchor.current?.();
    restoreAnchor.current = undefined;
  }, [first]);

  // 결과가 화면에 반영된 뒤 한 번 남긴다. 분석 도구는 이 화면 밖의 시스템이다.
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
      condition_count: countConditions(filter) + skinChoicesOf(filter).length,
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

  // 서버 응답이 없거나 조건을 바꿔 첫 장을 기다릴 때도 카드 자리를 유지한다(S50a).
  if (loading && items.length === 0) return <ProductRowsSkeleton />;
  if (failed && !loaded) {
    // 받지 못한 것을 없는 것으로 말하지 않는다. 화면 오류(S51)와 같은 모양으로 다시 시도하게 한다.
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="info-circle" size={28} />}
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
    <main className="flex flex-1 flex-col gap-2 px-gutter">
      {/* 결과 수와 '결과 없음'은 이 자리가 한 번 알린다(A11Y D06). 0개면 결과 수 대신 빈 상태를 둔다(S51e). */}
      {empty ? (
        <div aria-live="polite" className="flex flex-1 flex-col">
          {emptyState}
        </div>
      ) : (
        <div aria-live="polite">
          <SortHeader total={total} sort={filter.sort} onChangeSort={onChangeSort} />
        </div>
      )}

      {/* 주소의 `?page=N` 으로 중간 장부터 들어온 사람이 앞쪽 장으로 돌아갈 길이다. 링크는 크롤러가 따라간다. */}
      {first > FIRST_PAGE ? (
        <LoadMore
          direction="previous"
          status={previousStatus(loadingPrevious, previousFailed)}
          onLoad={onLoadPrevious}
          href={previousHref}
        />
      ) : null}

      {empty ? null : (
        <ul aria-busy={loading || undefined}>
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
  );
}
