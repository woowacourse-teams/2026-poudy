import type { Filter } from "./filter";

export type IngredientGroup = {
  readonly code: string;
  readonly name: string;
  readonly ingredientIds: readonly number[];
};

export type IngredientGroups = ReadonlyMap<string, IngredientGroup>;

export type GroupConditionKey = "includeGroupCodes" | "excludeGroupCodes";

/** 성분군 이름의 `계열` 은 뺀다. `세라마이드 계열` 보다 `세라마이드` 가 짧고 뜻이 같다. */
export const groupDisplayName = (name: string): string => name.replace(/\s*계열$/, "");

/** 성분군에 든 성분 수. 예: '15종' */
export const groupSizeLabel = (group: IngredientGroup): string => `${group.ingredientIds.length}종`;

/** 검색 결과의 성분군 행 이름. 이름 뒤에 '계열'을 붙이고, 이미 붙어 있으면 그대로 둔다. 예: '세라마이드 계열' */
export const groupResultName = (group: IngredientGroup): string => `${groupDisplayName(group.name)} 계열`;

/** 적용된 조건 칩의 성분군 이름. 예: '세라마이드 15종' */
export const groupLabel = (group: IngredientGroup): string =>
  `${groupDisplayName(group.name)} ${groupSizeLabel(group)}`;

export const selectedGroupCodes = (filter: Filter): readonly string[] => [
  ...filter.includeGroupCodes,
  ...filter.excludeGroupCodes,
];

export const coveredIngredientIds = (filter: Filter, groups: IngredientGroups): ReadonlySet<number> =>
  new Set(selectedGroupCodes(filter).flatMap((code) => groups.get(code)?.ingredientIds ?? []));

export const excludedGroupIngredients = (
  filter: Filter,
  groups: IngredientGroups,
): ReadonlyMap<string, readonly number[]> =>
  new Map(filter.excludeGroupCodes.map((code) => [code, groups.get(code)?.ingredientIds ?? []]));

export const groupCondition = (key: GroupConditionKey): "include" | "exclude" => {
  if (key === "includeGroupCodes") return "include";
  return "exclude";
};

const otherKey = (key: GroupConditionKey): GroupConditionKey => {
  if (key === "includeGroupCodes") return "excludeGroupCodes";
  return "includeGroupCodes";
};

export const toggleGroup = (filter: Filter, key: GroupConditionKey, code: string): Partial<Filter> => {
  const other = otherKey(key);
  if (filter[key].includes(code)) {
    return { [key]: filter[key].filter((value) => value !== code) };
  }
  return {
    [key]: [...filter[key], code],
    [other]: filter[other].filter((value) => value !== code),
  };
};
