import type { BrandResponse, CategoryResponse, SkinTypeResponse } from "@poudy/api/api.zod";
import { Tag } from "@poudy/design-system/tag";

import type { SheetKind } from "./FilterSheets";

import { type Filter, SENSITIVE, SKIN_TYPE_NAMES } from "@/lib/domain/filter";

type Props = {
  readonly kind: SheetKind;
  readonly draft: Filter;
  readonly brands: readonly BrandResponse[];
  readonly categories: readonly CategoryResponse[];
  readonly skinTypes: readonly SkinTypeResponse[];
  readonly sensitiveSkinAvailable: boolean;
  readonly onChange: (filter: Filter) => void;
};

const missingSelections = ({ kind, draft, brands, categories, skinTypes, sensitiveSkinAvailable, onChange }: Props) => {
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
    // 대분류 ID 는 '전체'를 고른 값이라 대분류도 후보에 넣는다.
    const offered = [...categories, ...categories.flatMap((category) => category.children)];
    return draft.categoryIds
      .filter((id) => !offered.some((category) => category.id === id))
      .map((id) => ({
        key: String(id),
        label: `카테고리 #${id}`,
        remove: () => onChange({ ...draft, categoryIds: draft.categoryIds.filter((value) => value !== id) }),
      }));
  }
  if (kind === "skinType") {
    const missingTypes = draft.skinTypes
      .filter((skinType) => !skinTypes.some((type) => type.code === skinType))
      .map((skinType) => ({
        key: skinType,
        label: SKIN_TYPE_NAMES[skinType],
        remove: () => onChange({ ...draft, skinTypes: draft.skinTypes.filter((value) => value !== skinType) }),
      }));
    return [
      ...missingTypes,
      ...(draft.sensitiveSkin && !sensitiveSkinAvailable
        ? [
            {
              key: SENSITIVE,
              label: SKIN_TYPE_NAMES.SENSITIVE,
              remove: () => onChange({ ...draft, sensitiveSkin: false }),
            },
          ]
        : []),
    ];
  }
  return [];
};

/** 후보와 선택 상태는 별개다. 지금 조건의 후보에서 사라진 선택도 하나씩 뺄 수 있다. */
export function UnavailableSelections(props: Props) {
  const missing = missingSelections(props);

  if (missing.length === 0) return null;
  return (
    <section aria-label="지금 후보에 없는 선택" className="flex flex-col gap-2 pb-3">
      <p className="text-body-sm text-text-secondary">지금 조건의 후보에 없는 선택</p>
      <div className="flex flex-wrap gap-2">
        {missing.map(({ key, label, remove }) => (
          <Tag key={key} variant="item" onRemove={remove}>
            {label}
          </Tag>
        ))}
      </div>
    </section>
  );
}
