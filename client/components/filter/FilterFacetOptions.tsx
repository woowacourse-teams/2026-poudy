"use client";

import { BrandOptions } from "./BrandOptions";
import { CategoryOptions } from "./CategoryOptions";
import { SkinTypeOptions } from "./SkinTypeOptions";

import type { Filter } from "@/lib/domain/filter";
import type { FilterFacet } from "@/lib/domain/filter-options";
import { useFilterOptions } from "@/lib/hooks/useFilterOptions";

type Props = {
  readonly facet: FilterFacet;
  readonly draft: Filter;
  readonly onChange: (filter: Filter) => void;
};

/** 시트의 선택과 후보를 연결한다. 선택 중에도 자기 조건은 조회 기준에 포함하지 않는다. */
export function FilterFacetOptions({ facet, draft, onChange }: Props) {
  const { result, retry } = useFilterOptions(draft, facet);
  if (!result) return <p role="status">선택지를 불러오는 중…</p>;
  if (result.status === "error") {
    return (
      <div role="alert">
        <p>선택지를 불러오지 못했어요.</p>
        <button type="button" onClick={retry}>
          다시 시도
        </button>
      </div>
    );
  }

  const { brands, categories, skinTypes } = result.options;
  if (facet === "brand") {
    return (
      <BrandOptions
        brands={brands}
        selectedIds={draft.brandIds}
        onToggle={(id) =>
          onChange({
            ...draft,
            brandIds: draft.brandIds.includes(id)
              ? draft.brandIds.filter((selected) => selected !== id)
              : [...draft.brandIds, id],
          })
        }
      />
    );
  }
  if (facet === "category") {
    return (
      <CategoryOptions
        categories={categories}
        selectedIds={draft.categoryIds}
        onSelect={(categoryIds) => onChange({ ...draft, categoryIds })}
      />
    );
  }
  return (
    <SkinTypeOptions
      skinTypes={skinTypes}
      selected={draft.skinType}
      onSelect={(skinType) => onChange({ ...draft, skinType })}
    />
  );
}
