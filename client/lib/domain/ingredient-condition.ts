import type { Filter } from "./filter";
import { type GroupConditionKey, type IngredientGroup, toggleGroup } from "./ingredient-groups";

/** 원하는 성분(include)과 피하고 싶은 성분(exclude). */
export type IngredientCondition = "include" | "exclude";

type IngredientKey = "includeIngredientIds" | "excludeIngredientIds";

const INGREDIENT_KEY: Record<IngredientCondition, IngredientKey> = {
  include: "includeIngredientIds",
  exclude: "excludeIngredientIds",
};

const GROUP_KEY: Record<IngredientCondition, GroupConditionKey> = {
  include: "includeGroupCodes",
  exclude: "excludeGroupCodes",
};

const OTHER: Record<IngredientCondition, IngredientCondition> = { include: "exclude", exclude: "include" };

export const ingredientKeyOf = (condition: IngredientCondition): IngredientKey => INGREDIENT_KEY[condition];

export const groupKeyOf = (condition: IngredientCondition): GroupConditionKey => GROUP_KEY[condition];

export const otherCondition = (condition: IngredientCondition): IngredientCondition => OTHER[condition];

/** 성분 조건으로 걸린 것의 수. 자주 피하는 성분은 따로 센다. */
export const conditionCount = (filter: Filter, condition: IngredientCondition): number =>
  filter[ingredientKeyOf(condition)].length + filter[groupKeyOf(condition)].length;

export const hasIngredientCondition = (filter: Filter): boolean =>
  conditionCount(filter, "include") + conditionCount(filter, "exclude") + filter.excludeCodes.length > 0;

/**
 * 성분 하나를 담거나 뺀다. 같은 성분을 원하는 성분과 피하고 싶은 성분에 함께 두면 결과가 반드시 비므로,
 * 담을 때는 다른 쪽에서 옮겨 온다.
 */
export const toggleIngredient = (filter: Filter, condition: IngredientCondition, id: number): Filter => {
  const key = ingredientKeyOf(condition);
  const other = ingredientKeyOf(otherCondition(condition));

  if (filter[key].includes(id)) return { ...filter, [key]: filter[key].filter((value) => value !== id) };
  return { ...filter, [key]: [...filter[key], id], [other]: filter[other].filter((value) => value !== id) };
};

export type GroupToggle = {
  readonly filter: Filter;
  /** 성분군에 들어 있어 성분군 하나로 묶은 성분(S34). 비어 있으면 묶은 것이 없다. */
  readonly absorbedIds: readonly number[];
};

/**
 * 성분군을 담거나 뺀다. 담을 때 그 성분군에 든 성분을 같은 쪽에 따로 담아 두었다면 성분군 하나로 묶는다.
 * 성분군이 이미 그 성분을 덮으므로 따로 둘 까닭이 없다.
 */
export const toggleGroupCondition = (
  filter: Filter,
  condition: IngredientCondition,
  group: IngredientGroup,
): GroupToggle => {
  const groupKey = groupKeyOf(condition);
  const adding = !filter[groupKey].includes(group.code);
  const toggled: Filter = { ...filter, ...toggleGroup(filter, groupKey, group.code) };
  if (!adding) return { filter: toggled, absorbedIds: [] };

  const key = ingredientKeyOf(condition);
  const absorbedIds = toggled[key].filter((id) => group.ingredientIds.includes(id));
  return {
    filter: { ...toggled, [key]: toggled[key].filter((id) => !absorbedIds.includes(id)) },
    absorbedIds,
  };
};

/** 피하는 성분군(자주 피하는 성분 포함)의 코드별 성분 ID. */
export type ExcludedGroupIngredients = ReadonlyMap<string, readonly number[]>;

/**
 * 원하는 성분으로 담으려는 성분을 막고 있는 피하는 성분군(S33). 그 성분군에 든 성분은 원하는 성분이 될 수 없다.
 * 서버도 CONFLICTING_INGREDIENT_FILTER 로 거절한다.
 */
export const blockingExcludeCodes = (
  filter: Filter,
  id: number,
  excluded: ExcludedGroupIngredients,
): readonly string[] =>
  [...filter.excludeCodes, ...filter.excludeGroupCodes].filter((code) => excluded.get(code)?.includes(id));

/** 피하는 성분군을 푼다. 자주 피하는 성분과 검색으로 담은 성분군을 가리지 않는다. */
export const releaseExcludes = (filter: Filter, codes: readonly string[]): Filter => ({
  ...filter,
  excludeCodes: filter.excludeCodes.filter((code) => !codes.includes(code)),
  excludeGroupCodes: filter.excludeGroupCodes.filter((code) => !codes.includes(code)),
});

/** 자주 피하는 성분을 켜면 함께 빠져야 하는 원하는 성분(S35). */
export const includedIdsIn = (filter: Filter, ingredientIds: readonly number[]): readonly number[] =>
  filter.includeIngredientIds.filter((id) => ingredientIds.includes(id));

/** 성분 추가 화면에서 새로 담은 수. 원래 있던 것은 세지 않는다. */
export const addedCount = (original: Filter, draft: Filter, condition: IngredientCondition): number => {
  const key = ingredientKeyOf(condition);
  const groupKey = groupKeyOf(condition);
  return (
    draft[key].filter((id) => !original[key].includes(id)).length +
    draft[groupKey].filter((code) => !original[groupKey].includes(code)).length
  );
};

const sameMembers = <T>(left: readonly T[], right: readonly T[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

/** 성분 조건이 바뀌었는지. 순서만 다른 것은 같다고 본다. */
export const ingredientConditionChanged = (original: Filter, draft: Filter): boolean =>
  !(
    sameMembers(original.includeIngredientIds, draft.includeIngredientIds) &&
    sameMembers(original.excludeIngredientIds, draft.excludeIngredientIds) &&
    sameMembers(original.includeGroupCodes, draft.includeGroupCodes) &&
    sameMembers(original.excludeGroupCodes, draft.excludeGroupCodes) &&
    sameMembers(original.excludeCodes, draft.excludeCodes)
  );

/** 성분 조건을 모두 비운다. 다른 조건은 그대로 둔다. */
export const clearIngredientConditions = (filter: Filter): Filter => ({
  ...filter,
  includeIngredientIds: [],
  excludeIngredientIds: [],
  includeGroupCodes: [],
  excludeGroupCodes: [],
  excludeCodes: [],
});
