import type { BrandResponse, CategoryResponse, MarkGroupOptionResponse, SkinChoiceResponse } from "@poudy/api/api.zod";
import { Tag } from "@poudy/design-system/tag";

import type { SheetKind } from "./FilterSheets";

import { type Filter, SENSITIVE, skinChoicesOf, type SkinNames } from "@/lib/domain/filter";

type Props = {
  readonly kind: SheetKind;
  readonly draft: Filter;
  readonly brands: readonly BrandResponse[];
  readonly categories: readonly CategoryResponse[];
  readonly skinOptions: readonly SkinChoiceResponse[];
  /** 후보에서 빠진 피부 선택지의 이름. `/api/skin-options` 에서 받는다. */
  readonly skinNames: SkinNames;
  readonly markGroups: readonly MarkGroupOptionResponse[];
  readonly onChange: (filter: Filter) => void;
};

const missingSelections = ({
  kind,
  draft,
  brands,
  categories,
  skinOptions,
  skinNames,
  markGroups,
  onChange,
}: Props) => {
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
    // 이름을 받기 전에는 마크처럼 코드를 적는다.
    return skinChoicesOf(draft)
      .filter((choice) => !skinOptions.some((option) => option.code === choice))
      .map((choice) => ({
        key: choice,
        label: skinNames.get(choice) ?? choice,
        remove: () =>
          onChange(
            choice === SENSITIVE
              ? { ...draft, sensitiveSkin: false }
              : { ...draft, skinTypes: draft.skinTypes.filter((value) => value !== choice) },
          ),
      }));
  }
  if (kind === "mark") {
    const offered = markGroups.flatMap((group) => group.options);
    // 이름은 서버의 후보에만 있다. 후보를 받지 못한 중간 장에서는 브랜드·카테고리의 ID 처럼 코드를 적는다.
    return draft.marks
      .filter((code) => !offered.some((option) => option.code === code))
      .map((code) => ({
        key: code,
        label: code,
        remove: () => onChange({ ...draft, marks: draft.marks.filter((value) => value !== code) }),
      }));
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
