import type { BrandResponse, CategoryResponse, SkinTypeResponse } from "@poudy/api/api.zod";

import type { SheetKind } from "./FilterSheets";

import type { Filter, SkinType } from "@/lib/domain/filter";

type Props = {
  readonly kind: SheetKind;
  readonly draft: Filter;
  readonly brands: readonly BrandResponse[];
  readonly categories: readonly CategoryResponse[];
  readonly skinTypes: readonly SkinTypeResponse[];
  readonly onChange: (filter: Filter) => void;
};

const SKIN_TYPE_NAMES: Record<SkinType, string> = {
  DRY: "건성",
  OILY: "지성",
  SENSITIVE: "민감성",
  COMBINATION: "복합성",
};

const missingSelections = ({ kind, draft, brands, categories, skinTypes, onChange }: Props) => {
  if (kind === "brand") {
    return draft.brandIds
      .filter((id) => !brands.some((brand) => brand.id === id))
      .map((id) => ({
        key: String(id),
        label: `브랜드 #${id}`,
        remove: () => onChange({ ...draft, brandIds: draft.brandIds.filter((value) => value !== id) }),
      }));
  }
  if (kind === "category") {
    const offered = categories.flatMap((category) => category.children);
    return draft.categoryIds
      .filter((id) => !offered.some((category) => category.id === id))
      .map((id) => ({
        key: String(id),
        label: `카테고리 #${id}`,
        remove: () => onChange({ ...draft, categoryIds: draft.categoryIds.filter((value) => value !== id) }),
      }));
  }
  if (kind === "skinType" && draft.skinType && !skinTypes.some((type) => type.code === draft.skinType)) {
    return [
      {
        key: draft.skinType,
        label: SKIN_TYPE_NAMES[draft.skinType],
        remove: () => onChange({ ...draft, skinType: undefined }),
      },
    ];
  }
  return [];
};

/** 후보와 선택 상태는 별개다. 후보에서 사라진 선택도 개별적으로 해제할 수 있다. */
export function UnavailableSelections(props: Props) {
  const missing = missingSelections(props);

  if (missing.length === 0) return null;
  return (
    <section aria-label="현재 후보에 없는 선택" className="py-3">
      <p className="text-sm text-text-secondary">현재 조건의 후보에 없는 선택</p>
      {missing.map(({ key, label, remove }) => (
        <button key={key} type="button" onClick={remove} className="mr-2 py-2 text-sm underline">
          {label} 해제
        </button>
      ))}
    </section>
  );
}
