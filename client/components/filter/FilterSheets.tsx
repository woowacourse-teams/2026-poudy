"use client";

import type { BrandResponse, CategoryResponse, ExcludeCodeResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { BrandOptions } from "./BrandOptions";
import { CategoryOptions } from "./CategoryOptions";
import { IngredientOptions } from "./IngredientOptions";
import { LevelRange } from "./LevelRangeOptions";

import { BottomSheet } from "@/components/ui/BottomSheet";
import type { FilterType } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { Filter } from "@/lib/domain/filter";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { useProductCount } from "@/lib/hooks/useProductCount";

export type SheetKind = "ingredient" | "category" | "brand" | "level";

type FilterSheetsProps = {
  readonly openSheet: SheetKind | undefined;
  readonly onClose: () => void;
  readonly filter: Filter;
  readonly onApply: (changed: Partial<Filter>) => void;
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandResponse[];
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  /** 시트를 연 시점에 이미 아는 결과 수. 첫 응답 전까지 버튼에 보여 준다. */
  readonly initialCount?: number;
};

const TITLES: Record<SheetKind, string> = {
  ingredient: "성분",
  category: "카테고리",
  brand: "브랜드",
  level: "유수분 범위",
};

/** 시트 종류를 분석 이벤트의 filter_type 으로 옮긴다. */
export const FILTER_TYPES: Record<SheetKind, FilterType> = {
  ingredient: "ingredient",
  category: "category",
  brand: "brand",
  level: "moisture_oil",
};

const DESCRIPTIONS: Record<SheetKind, string> = {
  ingredient: "성분을 선택하고 포함·제외 조건을 정해 보세요",
  category: "원하는 제품 카테고리를 선택해 주세요",
  brand: "원하는 브랜드를 선택해 주세요",
  level: "원하는 사용감 범위를 각각 선택해 주세요",
};

/**
 * 시트 안의 선택은 로컬 상태로 두고 개수만 미리 조회한다.
 * 적용을 눌렀을 때만 URL 에 반영해 취소하면 원래 조건이 남게 한다.
 */
export function FilterSheets({ openSheet, ...rest }: FilterSheetsProps) {
  /*
   * 닫힌 뒤에도 나가는 전환이 끝날 때까지 시트가 남아야 한다. 여기서 곧바로 지우면
   * BottomSheet 가 아무리 기다려도 이미 트리에서 빠진 뒤라 내려가는 모습이 보이지 않는다.
   * 마지막으로 열었던 종류를 기억해 두고 그 내용을 그대로 그린다.
   */
  const [lastKind, setLastKind] = useState(openSheet);

  if (openSheet && openSheet !== lastKind) setLastKind(openSheet);
  if (!lastKind) return null;

  return <SheetBody key={lastKind} kind={lastKind} open={Boolean(openSheet)} {...rest} />;
}

function SheetBody({
  kind,
  onClose,
  filter,
  onApply,
  categories,
  brands,
  excludeCodes,
  initialCount,
  open,
}: Omit<FilterSheetsProps, "openSheet"> & { readonly kind: SheetKind; readonly open: boolean }) {
  const [draft, setDraft] = useState<Filter>(filter);
  const count = useProductCount(draft, initialCount);

  // 담긴 성분의 이름은 서버에서 가져온다.
  const names = useIngredientNames([...draft.includeIngredientIds, ...draft.excludeIngredientIds]);

  // 유수분만 디자인 문구가 다르다.
  const countLabel = count === undefined ? "" : `${count.toLocaleString("ko-KR")}개 `;
  const submitLabel = kind === "level" ? `선택한 범위로 ${countLabel}보기` : `${countLabel}제품 보기`;

  const reset = () => {
    track("filter_reset", { filter_type: FILTER_TYPES[kind] });

    setDraft({
      ...draft,
      ...(kind === "category" ? { categoryIds: [] } : {}),
      ...(kind === "brand" ? { brandIds: [] } : {}),
      ...(kind === "level" ? { moistureLevel: [], oilLevel: [] } : {}),
      ...(kind === "ingredient" ? { excludeCodes: [], excludeIngredientIds: [], includeIngredientIds: [] } : {}),
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header title={TITLES[kind]} description={DESCRIPTIONS[kind]} />

      <BottomSheet.Body>
        {kind === "category" ? (
          <CategoryOptions
            categories={categories}
            selectedIds={draft.categoryIds}
            onSelect={(categoryIds) => setDraft({ ...draft, categoryIds })}
          />
        ) : null}

        {kind === "brand" ? (
          <BrandOptions
            brands={brands}
            selectedIds={draft.brandIds}
            onToggle={(brandId) =>
              setDraft({
                ...draft,
                brandIds: draft.brandIds.includes(brandId)
                  ? draft.brandIds.filter((id) => id !== brandId)
                  : [...draft.brandIds, brandId],
              })
            }
          />
        ) : null}

        {kind === "level" ? (
          <>
            {/* 소제목은 시트가 그린다. 슬라이더는 값과 상관없음만 담는다. */}
            <section className="pt-3">
              <h3 className="flex h-6 items-center text-[15px] font-bold text-[#212124]">수분감</h3>
              <LevelRange
                label="수분감"
                levels={draft.moistureLevel}
                onChange={(moistureLevel) => setDraft({ ...draft, moistureLevel })}
              />
            </section>

            {/* 두 범위는 서로 다른 조건이라 사이를 넉넉히 띄워 한 덩어리로 보이지 않게 한다. */}
            <section className="pt-8">
              <h3 className="flex h-6 items-center text-[15px] font-bold text-[#212124]">유분감</h3>
              <LevelRange
                label="유분감"
                levels={draft.oilLevel}
                onChange={(oilLevel) => setDraft({ ...draft, oilLevel })}
              />
            </section>
          </>
        ) : null}

        {kind === "ingredient" ? (
          <IngredientOptions draft={draft} setDraft={setDraft} excludeCodes={excludeCodes} names={names} />
        ) : null}
      </BottomSheet.Body>

      <BottomSheet.Footer>
        <BottomSheet.ResetButton onClick={reset} />
        {/* 아직 세지 못한 것과 0 개는 다르다. 세는 동안에는 막지 않는다. */}
        <BottomSheet.SubmitButton
          disabled={count === 0}
          onClick={() => {
            onApply(draft);
            onClose();
          }}
        >
          {submitLabel}
        </BottomSheet.SubmitButton>
      </BottomSheet.Footer>
    </BottomSheet>
  );
}
