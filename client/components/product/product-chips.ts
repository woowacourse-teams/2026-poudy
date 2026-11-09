import type {
  BrandResponse,
  CategoryResponse,
  IngredientGroupResponse,
  MarkGroupOptionResponse,
} from "@poudy/api/api.zod";

import type { MarkSheetKind, SheetKind } from "@/components/filter/FilterSheets";
import { knownExcludeCodes } from "@/lib/domain/exclude-codes";
import { type Filter, skinChoicesOf, type SkinNames, skinNamesOf } from "@/lib/domain/filter";
import { keepIf } from "@/lib/domain/optional";
import { LEVEL_LABELS } from "@/lib/domain/product-display";

/** 필터 칩 하나. 값이 있으면 칩 이름 자리에 값을 쓰고 선택 모양이 된다(명세 APP · 필터 칩 · 선택). */
export type FilterChipItem = {
  readonly id: SheetKind;
  readonly label: string;
  readonly value?: string;
};

/**
 * 칩에 값을 적는 데 쓰는 이름표. 브랜드·카테고리는 목록 응답의 필터 후보에서, 피부 선택지는 `/api/skin-types` 에서 받는다.
 * 아직 없으면 개수로 적는다.
 */
export type ChipNames = {
  readonly categories: readonly CategoryResponse[];
  readonly brands: readonly BrandResponse[];
  readonly skinNames?: SkinNames;
  readonly markGroups?: readonly MarkGroupOptionResponse[];
};

/** 그룹을 모르는 마크 칩의 이름. 후보를 받지 못한 중간 장으로 들어왔을 때만 보인다. */
const UNGROUPED_MARK_LABEL = "제품 특성";

/** 서버의 마크 그룹마다 칩과 시트를 하나씩 둔다. */
export const markSheetKind = (groupCode: string): MarkSheetKind => `mark:${groupCode}`;

export const isMarkGroupSheet = (kind: SheetKind): kind is MarkSheetKind => kind.startsWith("mark:");

export const markGroupOf = (
  kind: SheetKind,
  groups: readonly MarkGroupOptionResponse[],
): MarkGroupOptionResponse | undefined => groups.find((group) => markSheetKind(group.code) === kind);

const markCodesOf = (group: MarkGroupOptionResponse): readonly string[] => group.options.map((option) => option.code);

/** 고른 마크 가운데 어느 그룹의 옵션에도 없는 코드. 서버는 고른 값을 후보에 남기므로 후보를 받기 전에만 생긴다. */
export const ungroupedMarks = (marks: readonly string[], groups: readonly MarkGroupOptionResponse[]) =>
  marks.filter((code) => !groups.some((group) => markCodesOf(group).includes(code)));

/** 이 칩의 시트가 비울 마크만 뺀 나머지. 다른 그룹에서 고른 마크는 남긴다. */
export const marksWithoutSheet = (
  kind: "mark" | MarkSheetKind,
  marks: readonly string[],
  groups: readonly MarkGroupOptionResponse[],
): readonly string[] => {
  if (kind === "mark") return marks.filter((code) => !ungroupedMarks(marks, groups).includes(code));
  const codes = markCodesOf(markGroupOf(kind, groups) ?? { code: "", name: "", options: [] });
  return marks.filter((code) => !codes.includes(code));
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

  // 대분류 ID 하나는 그 대분류 전체다(카테고리 시트의 '전체').
  const parent = ids.length === 1 ? categories.find((category) => category.id === ids[0]) : undefined;
  if (parent) return parent.name;

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

/** 피부 타입 칩의 값. 건성·지성·복합성과 민감성을 여러 개 걸 수 있다. 이름을 모르면 개수로 적는다. */
const skinTypeValue = (filter: Filter, skinNames: SkinNames): string | undefined => {
  const choices = skinChoicesOf(filter);
  if (choices.length === 0) return undefined;
  const named = skinNamesOf(choices, skinNames);
  if (!named) return `피부 타입 ${choices.length}`;
  return firstAndRest(named);
};

/** 마크 그룹 칩의 값. 이름과 순서는 서버의 옵션을 따른다. */
const markGroupValue = (group: MarkGroupOptionResponse, marks: readonly string[]): string | undefined =>
  firstAndRest(group.options.filter((option) => marks.includes(option.code)).map((option) => option.name));

/**
 * 칩 줄의 순서는 성분 → 카테고리 → 브랜드 → 유수분 → 피부 타입 → 마크 그룹으로 고정한다(명세 S23e).
 * 마크 그룹의 수와 이름, 순서는 서버가 정한다. 후보를 받지 못해도 이미 고른 값은 풀 수 있게 칩을 하나 남긴다.
 */
export const chipsOf = (filter: Filter, names: ChipNames): readonly FilterChipItem[] => {
  const ingredientCount = ingredientConditionCount(filter);
  const markGroups = names.markGroups ?? [];
  const ungrouped = ungroupedMarks(filter.marks, markGroups);

  return [
    { id: "ingredient", label: "성분", value: ingredientCount > 0 ? `성분 ${ingredientCount}` : undefined },
    { id: "category", label: "카테고리", value: categoryValue(filter.categoryIds, names.categories) },
    { id: "brand", label: "브랜드", value: brandValue(filter.brandIds, names.brands) },
    { id: "level", label: "유수분", value: levelValue(filter) },
    { id: "skinType", label: "피부 타입", value: skinTypeValue(filter, names.skinNames ?? new Map()) },
    ...markGroups.map((group) => ({
      id: markSheetKind(group.code),
      label: group.name,
      value: markGroupValue(group, filter.marks),
    })),
    ...keepIf<FilterChipItem>(ungrouped.length > 0, {
      id: "mark",
      label: UNGROUPED_MARK_LABEL,
      value: `${UNGROUPED_MARK_LABEL} ${ungrouped.length}`,
    }),
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
  {
    excludeCodes,
    markGroups,
  }: {
    readonly excludeCodes: readonly IngredientGroupResponse[];
    readonly markGroups: readonly MarkGroupOptionResponse[];
  },
): number => {
  if (isMarkGroupSheet(kind)) return filter.marks.length - marksWithoutSheet(kind, filter.marks, markGroups).length;

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
      return skinChoicesOf(filter).length;
    case "mark":
      return ungroupedMarks(filter.marks, markGroups).length;
  }
};
