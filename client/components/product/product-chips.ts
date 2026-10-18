import type { BrandResponse, CategoryResponse, IngredientGroupResponse, SkinTypeResponse } from "@poudy/api/api.zod";

import type { SheetKind } from "@/components/filter/FilterSheets";
import { knownExcludeCodes } from "@/lib/domain/exclude-codes";
import { type Filter, SKIN_TYPE_NAMES } from "@/lib/domain/filter";
import { LEVEL_LABELS } from "@/lib/domain/product-display";

/** 필터 칩 하나. 값이 있으면 칩 이름 자리에 값을 쓰고 선택 모양이 된다(명세 APP · 필터 칩 · 선택). */
export type FilterChipItem = {
  readonly id: SheetKind;
  readonly label: string;
  readonly value?: string;
};

/** 칩에 값을 적는 데 쓰는 이름표. 목록 응답의 필터 후보에서 받는다. 아직 없으면 개수로 적는다. */
export type ChipNames = {
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandResponse[];
  readonly skinTypes?: readonly SkinTypeResponse[];
};

/** 하나면 그 이름, 여럿이면 '첫 이름 외 N개'(명세 APP · 필터 칩 · 선택). */
const firstAndRest = (names: readonly string[]): string | undefined => {
  if (names.length === 0) return undefined;
  if (names.length === 1) return names[0];
  return `${names[0]} 외 ${names.length - 1}개`;
};

/** 성분 칩의 N. 적용된 조건 줄에 놓이는 칩 수와 같다. */
export const ingredientConditionCount = (filter: Filter): number =>
  filter.includeIngredientIds.length +
  filter.includeGroupCodes.length +
  filter.excludeIngredientIds.length +
  filter.excludeCodes.length +
  filter.excludeGroupCodes.length;

/**
 * 카테고리 칩의 값. 대분류의 소분류를 모두 골랐으면 대분류 이름, 소분류 하나면 소분류 이름이다.
 * 고른 것이 후보에 없으면 개수로 적는다.
 */
const categoryValue = (ids: readonly number[], categories: readonly CategoryResponse[]): string | undefined => {
  if (ids.length === 0) return undefined;

  const whole = categories.find(
    (category) =>
      category.children.length > 0 &&
      category.children.length === ids.length &&
      category.children.every((child) => ids.includes(child.id)),
  );
  if (whole) return whole.name;

  const children = categories.flatMap((category) => category.children);
  const names = ids.flatMap((id) => children.filter((child) => child.id === id).map((child) => child.name));
  if (names.length !== ids.length) return `카테고리 ${ids.length}`;
  return firstAndRest(names);
};

const brandValue = (ids: readonly number[], brands: readonly BrandResponse[]): string | undefined => {
  if (ids.length === 0) return undefined;
  const names = ids.flatMap((id) => brands.filter((brand) => brand.id === id).map((brand) => brand.name));
  if (names.length !== ids.length) return `브랜드 ${ids.length}`;
  return firstAndRest(names);
};

/** '수분감 보통~높음'. 한 단계만 고르면 '수분감 보통'이다. */
export const levelRangeLabel = (label: string, levels: readonly number[]): string | undefined => {
  if (levels.length === 0) return undefined;
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  if (min === max) return `${label} ${LEVEL_LABELS[min]}`;
  return `${label} ${LEVEL_LABELS[min]}~${LEVEL_LABELS[max]}`;
};

const levelValue = (filter: Filter): string | undefined =>
  firstAndRest(
    [levelRangeLabel("수분감", filter.moistureLevel), levelRangeLabel("유분감", filter.oilLevel)].filter(
      (part): part is string => part !== undefined,
    ),
  );

/** 피부 타입 칩의 값. 건성·지성·복합성 가운데 하나와 민감성을 함께 걸 수 있다. */
const skinTypeValue = (filter: Filter): string | undefined =>
  firstAndRest([
    ...(filter.skinType ? [SKIN_TYPE_NAMES[filter.skinType]] : []),
    ...(filter.sensitiveSkin ? [SKIN_TYPE_NAMES.SENSITIVE] : []),
  ]);

/** 칩 줄의 순서는 성분 → 카테고리 → 브랜드 → 유수분 → 피부 타입으로 고정한다(명세 S23e). */
export const chipsOf = (filter: Filter, names: ChipNames): readonly FilterChipItem[] => {
  const ingredientCount = ingredientConditionCount(filter);

  return [
    { id: "ingredient", label: "성분", value: ingredientCount > 0 ? `성분 ${ingredientCount}` : undefined },
    { id: "category", label: "카테고리", value: categoryValue(filter.categoryIds, names.categories) },
    { id: "brand", label: "브랜드", value: brandValue(filter.brandIds, names.brands) },
    { id: "level", label: "유수분", value: levelValue(filter) },
    { id: "skinType", label: "피부 타입", value: skinTypeValue(filter) },
  ];
};

/**
 * 성분 칩의 분석용 숫자(`filter_applied` 의 filter_value_count). 화면의 '성분 N'과 다르게, 자주 피하는 성분은 묶음 하나가
 * 아니라 그 안의 성분 수로 센다. 이벤트의 뜻을 바꾸지 않으려고 개편 전 계산을 그대로 둔다.
 */
const analyticsIngredientCount = (filter: Filter, excludeCodes: readonly IngredientGroupResponse[]): number => {
  const picked = new Set<number>(filter.excludeIngredientIds);

  for (const code of knownExcludeCodes(excludeCodes)) {
    if (!filter.excludeCodes.includes(code.code)) continue;
    for (const ingredient of code.ingredients) picked.add(ingredient.id);
  }

  return picked.size + filter.excludeGroupCodes.length;
};

/** `filter_applied` 의 filter_value_count. 시트마다 고른 값의 수다. */
export const filterValueCount = (
  kind: SheetKind,
  filter: Filter,
  excludeCodes: readonly IngredientGroupResponse[],
): number => {
  switch (kind) {
    case "ingredient":
      return analyticsIngredientCount(filter, excludeCodes);
    case "category":
      return filter.categoryIds.length;
    case "brand":
      return filter.brandIds.length;
    case "level":
      return (filter.moistureLevel.length > 0 ? 1 : 0) + (filter.oilLevel.length > 0 ? 1 : 0);
    case "skinType":
      return (filter.skinType ? 1 : 0) + (filter.sensitiveSkin ? 1 : 0);
  }
};
