"use client";

import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { useMemo, useState } from "react";

import { chipsOf } from "./product-chips";
import { ProductRows } from "./ProductRows";

import type { SheetKind } from "@/components/filter/FilterSheets";
import { FilterChipBar } from "@/components/ui/FilterChipBar";
import type { ListSurface } from "@/lib/analytics/events";
import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import { countConditions, summarizeFilter } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import type { InitialPage } from "@/lib/hooks/useProductPages";

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
  /** 서버가 받아 렌더링에 포함한 첫 장. */
  readonly initialPage?: InitialPage;
};

/**
 * S04 조건 일치 제품. 조건은 URL 이 들고, 목록은 페이지를 이어 붙인다.
 *
 * 제품 데이터가 도착하면 행 전체를 실제 내용으로 그리고, 각 이미지만 자기 로딩 상태를
 * `ProductThumbnail`에서 따로 표시한다.
 */
export function ProductList({
  excludeCodes,
  basePath = "/products",
  fixedFilter,
  hiddenChips = [],
  surface = "product_list",
  initialPage,
}: ProductListProps) {
  const { filter: urlFilter } = useFilterQuery(basePath);
  const [openSheet, setOpenSheet] = useState<SheetKind>();

  // 고정 조건은 URL 조건 위에 덮어써서 사용자가 지울 수 없게 한다.
  const filter = useMemo(() => ({ ...urlFilter, ...fixedFilter }), [fixedFilter, urlFilter]);

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
        </div>
      </div>

      <ProductRows
        filter={filter}
        basePath={basePath}
        surface={surface}
        excludeCodes={excludeCodes}
        openSheet={openSheet}
        onCloseSheet={() => setOpenSheet(undefined)}
        initialPage={initialPage}
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

/** 디자인의 `탐색 조건` 요약. 지금 걸린 조건을 읽기 전용으로 보여 준다. */
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
