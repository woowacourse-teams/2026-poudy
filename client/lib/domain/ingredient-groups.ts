import type { Filter } from "./filter";

export type IngredientGroup = {
  readonly code: string;
  readonly name: string;
  readonly ingredientIds: readonly number[];
};

export type IngredientGroups = ReadonlyMap<string, IngredientGroup>;

export type GroupConditionKey = "includeGroupCodes" | "excludeGroupCodes";

export const groupLabel = (group: IngredientGroup): string =>
  `${group.name.replace(/\s*계열$/, "")} ${group.ingredientIds.length}종`;

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

export const toggleGroup = (filter: Filter, key: GroupConditionKey, group: IngredientGroup): Partial<Filter> => {
  const other = otherKey(key);
  if (filter[key].includes(group.code)) {
    return { [key]: filter[key].filter((value) => value !== group.code) };
  }
  const outsideGroup = (id: number) => !group.ingredientIds.includes(id);
  return {
    [key]: [...filter[key], group.code],
    [other]: filter[other].filter((value) => value !== group.code),
    includeIngredientIds: filter.includeIngredientIds.filter(outsideGroup),
    excludeIngredientIds: filter.excludeIngredientIds.filter(outsideGroup),
  };
};
