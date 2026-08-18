"use client";

import type {
  BrandListItemResponse,
  CategoryResponse,
  ExcludeCodeResponse,
  IngredientResponse,
} from "@poudy/api/api.zod";
import { useState } from "react";

import { BrandOptions } from "./BrandOptions";
import { CategoryOptions } from "./CategoryOptions";
import { IngredientOptions } from "./IngredientOptions";
import { LevelRange } from "./LevelRangeOptions";

import { BottomSheet } from "@/components/ui/BottomSheet";
import type { Filter } from "@/lib/domain/filter";
import { useProductCount } from "@/lib/hooks/useProductCount";

export type SheetKind = "ingredient" | "category" | "brand" | "level";

type FilterSheetsProps = {
  readonly openSheet: SheetKind | undefined;
  readonly onClose: () => void;
  readonly filter: Filter;
  readonly onApply: (changed: Partial<Filter>) => void;
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandListItemResponse[];
  readonly excludeCodes: readonly ExcludeCodeResponse[];
};

const TITLES: Record<SheetKind, string> = {
  ingredient: "성분",
  category: "카테고리",
  brand: "브랜드",
  level: "유수분 범위",
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
  if (!openSheet) return null;
  return <SheetBody key={openSheet} kind={openSheet} {...rest} />;
}

function SheetBody({
  kind,
  onClose,
  filter,
  onApply,
  categories,
  brands,
  excludeCodes,
}: Omit<FilterSheetsProps, "openSheet"> & { readonly kind: SheetKind }) {
  const [draft, setDraft] = useState<Filter>(filter);
  const [names, setNames] = useState<ReadonlyMap<number, string>>(new Map());
  const count = useProductCount(draft);

  const learnNames = (ingredients: readonly IngredientResponse[]) =>
    setNames((previous) => {
      const next = new Map(previous);
      for (const item of ingredients) next.set(item.id, item.koreanName);
      return next;
    });

  // 유수분만 디자인 문구가 다르다.
  const countLabel = count === undefined ? "" : `${count.toLocaleString("ko-KR")}개 `;
  const submitLabel = kind === "level" ? `선택한 범위로 ${countLabel}보기` : `${countLabel}제품 보기`;

  const reset = () =>
    setDraft({
      ...draft,
      ...(kind === "category" ? { categoryIds: [] } : {}),
      ...(kind === "brand" ? { brandIds: [] } : {}),
      ...(kind === "level" ? { moistureLevel: [], oilLevel: [] } : {}),
      ...(kind === "ingredient" ? { excludeCodes: [], excludeIngredientIds: [], includeIngredientIds: [] } : {}),
    });

  return (
    <BottomSheet
      open
      title={TITLES[kind]}
      description={DESCRIPTIONS[kind]}
      onClose={onClose}
      onReset={reset}
      submitLabel={submitLabel}
      onSubmit={() => {
        onApply(draft);
        onClose();
      }}
    >
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
          <LevelRange
            label="수분감"
            levels={draft.moistureLevel}
            onChange={(moistureLevel) => setDraft({ ...draft, moistureLevel })}
          />
          <LevelRange
            label="유분감"
            levels={draft.oilLevel}
            onChange={(oilLevel) => setDraft({ ...draft, oilLevel })}
          />
        </>
      ) : null}

      {kind === "ingredient" ? (
        <IngredientOptions
          draft={draft}
          setDraft={setDraft}
          excludeCodes={excludeCodes}
          names={names}
          onLearnNames={learnNames}
        />
      ) : null}
    </BottomSheet>
  );
}
