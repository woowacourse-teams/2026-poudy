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

export const groupLabel = (group: IngredientGroup): string =>
  `${groupDisplayName(group.name)} ${group.ingredientIds.length}종`;

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
