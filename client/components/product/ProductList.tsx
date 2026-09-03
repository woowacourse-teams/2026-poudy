"use client";

import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { useEffect, useMemo, useRef, useState } from "react";

import { FILTER_TYPES, FilterSheets, type SheetKind } from "@/components/filter/FilterSheets";
import { FilterChipBar, type FilterChipItem } from "@/components/ui/FilterChipBar";
import { ProductCard } from "@/components/ui/ProductCard";
import { SortHeader } from "@/components/ui/SortHeader";
import type { ListSurface, SearchMode } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import { countConditions, summarizeFilter } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { useProductPages } from "@/lib/hooks/useProductPages";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import { ANCHOR_ATTRIBUTE } from "@/lib/navigation/scroll-anchor";

type ProductListProps = {
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  /** 조건을 어느 주소에 쓸지. 브랜드 상세는 자기 주소에 남긴다. */
  readonly basePath?: string;
  /** 화면이 고정하는 조건. 브랜드 상세의 브랜드처럼 사용자가 바꾸지 않는 값이다. */
  readonly fixedFilter?: Partial<Filter>;
  /** 고정한 조건에 해당하는 칩은 숨긴다. */
  readonly hiddenChips?: readonly string[];
  /** 같은 목록을 여러 화면이 쓰므로 분석 이벤트에 어디인지 남긴다. */
  readonly surface?: ListSurface;
};

/**
 * 성분 칩의 숫자. 빠른 필터는 성분을 묶어 둔 것이라 묶음 하나가 아니라 그 안의 성분 수로 센다.
 * 낱개로 고른 성분과 겹칠 수 있으므로 한 번만 세도록 모아서 헤아린다.
 */
const countIngredients = (filter: Filter, excludeCodes: readonly ExcludeCodeResponse[]): number => {
  const picked = new Set<number>(filter.excludeIngredientIds);

  for (const code of excludeCodes) {
    if (!filter.excludeCodes.includes(code.code)) continue;
    for (const ingredient of code.ingredients) picked.add(ingredient.id);
  }

  return picked.size;
};

const chipsOf = (filter: Filter, excludeCodes: readonly ExcludeCodeResponse[]): readonly FilterChipItem[] => [
  {
    id: "ingredient",
    label: "성분",
    count: countIngredients(filter, excludeCodes),
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
  excludeCodes,
  basePath = "/products",
  fixedFilter,
  hiddenChips = [],
  surface = "product_list",
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
  const filter = useMemo(() => ({ ...urlFilter, ...fixedFilter }), [fixedFilter, urlFilter]);

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
  } = useProductPages(filter);
  const sentinel = useInfiniteScroll(hasNext && !loading, loadNext);

  const empty = items.length === 0 && !loading;
  const conditionCount = countConditions(filter);
  const ingredientConditionCount =
    filter.includeIngredientIds.length + filter.excludeIngredientIds.length + filter.excludeCodes.length;
  const searchMode: SearchMode | undefined = filter.keyword
    ? "product"
    : ingredientConditionCount > 0
      ? "ingredient"
      : undefined;
  const trackedResultKey = useRef<string | undefined>(undefined);

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

  /*
   * 지금 조건에 걸린 브랜드만 고르게 한다. 결과가 0 건인 브랜드가 목록에서 빠진다.
   * 목록 응답이 함께 실어 보내므로 따로 받지 않는다. 첫 응답 전에는 비어 있는데,
   * 이 값은 필터 시트 안에서만 쓰이고 그때는 이미 응답이 도착해 있다.
   */

  // 첫 장은 화면 진입과 같으므로 세지 않는다. 이어 붙인 장만 탐색 깊이로 본다.
  useEffect(() => {
    if (page > 0 && !loading) track("product_list_scrolled", { surface, page, loaded_count: items.length });
    // 장이 늘었을 때만 남긴다. 같은 장에서 다시 그려도 보내지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loading]);

  useEffect(() => {
    if (empty) track("empty_result_shown", { surface, condition_count: conditionCount });
  }, [empty, surface, conditionCount]);

  // 화면이 고정한 조건은 제목과 탭이 이미 알려 주므로 요약에서 뺀다(디자인 S09·S11).
  const summaryFilter = { ...filter, ...blankFilter(fixedFilter) };

  return (
    <>
      {/*
        머리 영역과 칩 줄 사이의 세로 간격을 여기서 한 번에 정한다.
        각 조각이 제 여백을 들고 있으면 조건이 있을 때와 없을 때의 조합이 달라져
        어느 값을 고쳐야 할지 알기 어려워진다.

        띠는 좌우 끝까지 깔려야 하므로 이 자리에서 벗어나지 않는다.
      */}
      <div className="flex flex-col gap-3 pt-4">
        <FilterSummary filter={summaryFilter} />
        <SectionDivider />

        <div className="bg-white px-4">
          <FilterChipBar
            chips={chipsOf(filter, excludeCodes).filter((chip) => !hiddenChips.includes(chip.id))}
            onOpen={(id) => setOpenSheet(id as SheetKind)}
          />
          <SortHeader total={total} sort={filter.sort} onChangeSort={onChangeSort} />
        </div>
      </div>

      <main className="flex-1 px-4">
        {empty ? (
          <p className="py-16 text-center text-[13px] text-text-secondary">조건에 맞는 제품이 없어요</p>
        ) : (
          <ul className="divide-y divide-divider">
            {items.map((product) => (
              // 되돌아왔을 때 보던 제품을 다시 찾는 표식이다.
              <li key={product.id} {...{ [ANCHOR_ATTRIBUTE]: product.id }}>
                <ProductCard
                  product={product}
                  saved={isSaved(product.id)}
                  onToggleSave={onToggleSave}
                  entryPoint={searchMode ? "search_results" : undefined}
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
        onClose={() => setOpenSheet(undefined)}
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

/**
 * 화면이 고정한 조건만 빈 값으로 되돌린다.
 * 사용자가 고른 조건이 아니라서 `탐색 조건` 요약에 세지 않는다.
 */
const blankFilter = (fixed: Partial<Filter> = {}): Partial<Filter> =>
  Object.fromEntries(Object.keys(fixed).map((key) => [key, EMPTY_FILTER[key as keyof Filter]]));

/** 디자인의 `탐색 조건` 요약. 지금 걸린 조건을 읽기 전용으로 보여 준다. */
/**
 * 위 영역과 칩 줄을 가르는 띠. 하는 일이 다른 두 영역이라 선 하나로는 덜 갈려
 * 좌우 끝까지 깔리는 띠로 나눈다.
 *
 * 위아래 간격은 감싸는 쪽이 정한다. 여기서 함께 들고 있으면 쓰는 자리마다
 * 간격이 달라져 어디를 고쳐야 할지 알기 어려워진다.
 *
 * 뜻을 전하지 않는 장식이라 보조 기술에서는 감춘다.
 */
function SectionDivider() {
  return <div className="h-3 bg-surface" aria-hidden="true" />;
}

function FilterSummary({ filter }: { readonly filter: Filter }) {
  // 조건에는 ID 만 남으므로 성분 이름은 서버에서 가져온다.
  const names = useIngredientNames([...filter.includeIngredientIds, ...filter.excludeIngredientIds]);
  const count = countConditions(filter);
  if (count === 0) return null;

  // 위아래 간격은 감싸는 쪽이 정한다.
  return (
    <section className="flex flex-col gap-1 px-4">
      <div className="flex items-center gap-1.5">
        <h2 className="text-[13px] font-bold text-[#212124]">탐색 조건</h2>
        <span className="rounded-full bg-[#F2F3F6] px-[7px] text-[11px] font-bold text-[#555D68]">{count}</span>
      </div>
      <p className="text-[12px] text-[#767B83]">{summarizeFilter(filter, names)}</p>
    </section>
  );
}
