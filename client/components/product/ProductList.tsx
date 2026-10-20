"use client";

import type { IngredientGroupResponse } from "@poudy/api/api.zod";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { AppliedConditions } from "./AppliedConditions";
import { LinkCleanupNotice } from "./LinkCleanupNotice";
import { pageHref } from "./page-href";
import { chipsOf, filterValueCount } from "./product-chips";
import { ProductListContext } from "./product-list-context";
import { ProductRows } from "./ProductRows";
import { STICKY_CHIP_BARS, type StickyChips } from "./sticky-chip-bar";

import { CLEARED, FILTER_TYPES, FilterSheets, type SheetKind } from "@/components/filter/FilterSheets";
import { FilterChipBar } from "@/components/ui/FilterChipBar";
import { StickyBar } from "@/components/ui/StickyBar";
import type { ListSurface, ProductEntryPoint } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { type ExcludeCodeIngredients, keepIncludedInstead, resolveLinkConflicts } from "@/lib/domain/conflict";
import { FIRST_PAGE, type Filter } from "@/lib/domain/filter";
import { selectedGroupCodes } from "@/lib/domain/ingredient-groups";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useIngredientGroups } from "@/lib/hooks/useIngredientGroups";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { type InitialPage, useProductPages, isEmptyResult } from "@/lib/hooks/useProductPages";

type ProductListProps = {
  readonly excludeCodes: readonly IngredientGroupResponse[];
  /** 조건을 어느 주소에 쓸지. 브랜드 상세는 자기 주소에 남긴다. */
  readonly basePath?: string;
  /** 화면이 고정하는 조건. 브랜드 상세의 브랜드처럼 사용자가 바꾸지 않는 값이다. */
  readonly fixedFilter?: Partial<Filter>;
  /** 고정한 조건에 해당하는 칩은 숨긴다. */
  readonly hiddenChips?: readonly string[];
  /** 같은 목록을 여러 화면이 쓰므로 분석 이벤트에 어디인지 남긴다. */
  readonly surface?: ListSurface;
  /** 홈의 바로가기처럼 일반 목록과 구분해야 하는 진입 경로. */
  readonly entryPoint?: ProductEntryPoint;
  /** 서버가 받아 렌더링에 포함한 첫 장. */
  readonly initialPage?: InitialPage;
  /** 칩 줄을 붙일 자리. 조건 일치 제품은 상단바 아래, 카테고리는 형제 카테고리 줄 아래, 브랜드관은 축약형 아래다. */
  readonly stickyChips?: StickyChips;
  /** 결과가 0개일 때 그릴 빈 상태. 화면마다 문구가 달라 반드시 넘긴다(FEEDBACK F03). */
  readonly empty: ReactNode;
};

const NO_FIXED_FILTER: Partial<Filter> = {};

/**
 * 조건 일치 제품 목록(명세 S23). 조건은 URL 이 들고, 목록은 장을 이어 붙인다.
 * 위에서부터 필터 칩 줄 → 적용된 조건 줄 → 결과 수 → 상품 목록 카드 순서다. 조건 일치 제품·카테고리 상품·브랜드 상세가 함께 쓴다.
 */
export function ProductList({
  excludeCodes,
  basePath = "/products",
  fixedFilter = NO_FIXED_FILTER,
  hiddenChips = [],
  surface = "product_list",
  entryPoint,
  initialPage,
  stickyChips,
  empty,
}: ProductListProps) {
  const { filter: urlFilter, setCondition, replace } = useFilterQuery(basePath);
  const [openSheet, setOpenSheet] = useState<SheetKind>();

  const codeIngredients: ExcludeCodeIngredients = useMemo(
    () => new Map(excludeCodes.map((code) => [code.code, code.ingredients.map((ingredient) => ingredient.id)])),
    [excludeCodes],
  );

  // 링크로 들어온 조건이 부딪히면 원하는 성분 쪽을 빼고 보여 준다(명세 S36). 무엇을 뺐는지는 들어온 때의 것만 알린다.
  const resolved = useMemo(() => resolveLinkConflicts(urlFilter, codeIngredients), [urlFilter, codeIngredients]);
  const [cleanup, setCleanup] = useState(resolved.removed);

  // 고정 조건은 URL 조건 위에 덮어써서 사용자가 지울 수 없게 한다.
  const filter = useMemo(() => ({ ...resolved.filter, ...fixedFilter }), [fixedFilter, resolved.filter]);

  /*
   * 정리한 조건을 주소에도 남긴다. 주소는 이 화면 밖(브라우저 기록)의 상태라 그려진 뒤에 한 번만 맞춘다.
   * 그대로 두면 뒤에 조건을 바꿀 때 부딪힌 조건이 다시 실려 간다.
   */
  const syncedCleanup = useRef(false);
  useEffect(() => {
    if (syncedCleanup.current || cleanup.length === 0) return;
    syncedCleanup.current = true;
    replace(resolved.filter);
    track("filter_conflict_shown", {
      conflict_count: new Set(cleanup.map((item) => item.code ?? `ingredient-${item.ingredientId}`)).size,
      ingredient_count: cleanup.length,
    });
  }, [cleanup, replace, resolved.filter]);

  const pages = useProductPages(filter, initialPage);
  const filterOptions = pages.filterOptions;

  // 조건에는 ID 만 남으므로 성분 이름은 서버에서 가져온다. 안내 줄이 짚는 뺀 성분도 함께 받는다.
  const names = useIngredientNames([
    ...filter.includeIngredientIds,
    ...filter.excludeIngredientIds,
    ...cleanup.map((item) => item.ingredientId),
  ]);
  const groups = useIngredientGroups(selectedGroupCodes(filter));

  const chips = chipsOf(filter, {
    categories: filterOptions?.categories ?? [],
    brands: filterOptions?.brands ?? [],
  }).filter((chip) => !hiddenChips.includes(chip.id));

  // 보이는 칩 가운데 값이 걸린 것만 비운다. 화면이 고정한 조건과 검색어는 칩이 아니므로 남는다.
  const resetChips = () => {
    const applied = chips.filter((chip) => chip.value !== undefined);
    setCondition(Object.assign({}, ...applied.map((chip) => CLEARED[chip.id])));
    track("filter_bar_reset", { filter_count: applied.length });
  };

  const actions = useMemo(
    () => ({ filter, fixedFilter, basePath, openSheet: setOpenSheet }),
    [basePath, filter, fixedFilter],
  );

  return (
    <ProductListContext value={actions}>
      {cleanup.length > 0 ? (
        // 명세(S36): 안내 줄은 상단 내비 바로 아래에 붙이고, 칩 줄과는 12(안내 줄 여백 4 + 간격 8)를 띄운다.
        // 칩 줄은 다른 묶음 안에 있어 간격(gap)으로 띄울 수 없으므로 아래 여백으로 둔다.
        <div className="px-gutter pb-3">
          <LinkCleanupNotice
            removed={cleanup}
            names={names}
            excludeCodes={excludeCodes}
            onKeepInstead={() => {
              setCondition(keepIncludedInstead(urlFilter, cleanup));
              setCleanup([]);
            }}
            onShowConditions={() => setOpenSheet("ingredient")}
            onClose={() => setCleanup([])}
          />
        </div>
      ) : null}

      {/*
        칩 줄과 그 아래 목록을 묶어, 결과가 적어도 칩 줄이 붙는 자리까지 스크롤되게 한다.
        칩 줄은 sticky 라 부모 안에서만 붙어 있다. 묶음 안의 첫 줄로 둔다.
      */}
      <ChipBarRunway sticky={stickyChips} empty={isEmptyResult(pages)}>
        <ChipBarSlot sticky={stickyChips}>
          <FilterChipBar chips={chips} expandedId={openSheet} onOpen={setOpenSheet} onReset={resetChips} />
        </ChipBarSlot>

        <div className="flex flex-1 flex-col gap-2">
          <AppliedConditions filter={filter} excludeCodes={excludeCodes} names={names} groups={groups} />

          <ProductRows
            filter={filter}
            basePath={basePath}
            surface={surface}
            entryPoint={entryPoint}
            pages={pages}
            empty={empty}
          />
        </div>
      </ChipBarRunway>

      <FilterSheets
        openSheet={openSheet}
        onClose={() => setOpenSheet(undefined)}
        filter={filter}
        onApply={(changed) => {
          setCondition(changed);
          if (openSheet) {
            track("filter_applied", {
              filter_type: FILTER_TYPES[openSheet],
              filter_value_count: filterValueCount(openSheet, { ...filter, ...changed }, excludeCodes),
            });
          }
        }}
        categories={filterOptions?.categories ?? []}
        brands={filterOptions?.brands ?? []}
        skinTypes={filterOptions?.skinTypes ?? []}
        excludeCodes={excludeCodes}
        initialCount={pages.total}
        optionsPageHref={filterOptions === undefined ? pageHref(basePath, urlFilter, FIRST_PAGE) : undefined}
      />
    </ProductListContext>
  );
}

/**
 * 붙는 칩 줄과 그 아래 목록을 묶어, 결과가 적어도 칩 줄이 붙는 자리까지 스크롤되게 한다.
 *
 * 결과가 하나도 없으면 최소 높이를 풀고 남은 화면만 채운다. 그대로 두면 칩 줄 위에 머리(브랜드 히어로 등)가 있는 화면에서
 * 묶음이 화면 아래로 넘쳐, 그 가운데에 놓이는 빈 상태가 스크롤 전 화면에서 아래로 치우친다.
 * 칩 줄이 붙은 채 조건을 바꿔 0개가 되면 문서가 짧아져 화면이 위로 움직이지만, 빈 상태가 가운데에 보이는 쪽을 택했다.
 */
function ChipBarRunway({
  sticky,
  empty,
  children,
}: {
  readonly sticky?: StickyChips;
  readonly empty: boolean;
  readonly children: ReactNode;
}) {
  if (!sticky || empty) return <div className="flex flex-1 flex-col">{children}</div>;
  return <div className={STICKY_CHIP_BARS[sticky].runwayClassName}>{children}</div>;
}

/** 칩 줄 자리. 붙는 화면이면 그 화면의 자리에 붙인다. */
function ChipBarSlot({ sticky, children }: { readonly sticky?: StickyChips; readonly children: ReactNode }) {
  if (!sticky) return <div className="bg-background">{children}</div>;

  const { stuckAt, className } = STICKY_CHIP_BARS[sticky];
  return (
    <StickyBar stuckAt={stuckAt} className={className}>
      {children}
    </StickyBar>
  );
}
