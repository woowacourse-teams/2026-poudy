import type { Filter } from "./filter";
import { withJosa } from "./format";
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

/**
 * 담으면 결과가 반드시 비는 조건을 정리한 결과(S33a · S35a). 묻지 않고 바로 정리하고, 화면은 무엇을 정리했는지
 * 안내 줄로 알리고 [되돌리기]를 둔다. 정리한 것이 없으면 목록이 모두 비어 있다.
 */
export type ConditionResolution = {
  readonly filter: Filter;
  /** 반대쪽에서 옮겨 온 성분 */
  readonly movedIds: readonly number[];
  /** 반대쪽에서 옮겨 온 성분군 */
  readonly movedGroupCodes: readonly string[];
  /** 원하는 성분으로 담으려고 피하기를 푼 성분군(자주 피하는 성분 포함) */
  readonly releasedCodes: readonly string[];
  /** 피하는 성분군에 들어 있어 원하는 성분에서 뺀 성분 */
  readonly droppedIds: readonly number[];
};

const resolution = (filter: Filter, changes: Partial<Omit<ConditionResolution, "filter">>): ConditionResolution => ({
  filter,
  movedIds: [],
  movedGroupCodes: [],
  releasedCodes: [],
  droppedIds: [],
  ...changes,
});

const when = <T>(condition: boolean, values: readonly T[]): readonly T[] => {
  if (condition) return values;
  return [];
};

/** 새로 담을 성분. 담는 쪽과 성분 ID 다. */
export type IngredientTarget = { readonly condition: IngredientCondition; readonly id: number };

/**
 * 성분 하나를 새로 담는다. 반대쪽에 있던 성분이면 옮겨 오고, 원하는 성분으로 담는데 피하는 성분군에 들어 있으면
 * 그 성분군 피하기를 푼다(S33 · S33a).
 */
export const addIngredient = (
  filter: Filter,
  { condition, id }: IngredientTarget,
  excluded: ExcludedGroupIngredients,
): ConditionResolution => {
  const releasedCodes = when(condition === "include", blockingExcludeCodes(filter, id, excluded));
  return resolution(toggleIngredient(releaseExcludes(filter, releasedCodes), condition, id), {
    movedIds: when(filter[ingredientKeyOf(otherCondition(condition))].includes(id), [id]),
    releasedCodes,
  });
};

/**
 * 성분군 하나를 새로 담는다. 같은 쪽에 따로 담아 둔 성분은 성분군 하나로 묶고(S34), 반대쪽에 있던 성분군이면 옮겨 온다(S33a).
 * 피하고 싶은 성분으로 담을 때 그 안의 성분이 원하는 성분에 있으면 원하는 성분에서 뺀다(S35 와 같은 정리).
 */
export const addGroup = (
  filter: Filter,
  condition: IngredientCondition,
  group: IngredientGroup,
): ConditionResolution & Pick<GroupToggle, "absorbedIds"> => {
  const otherKey = groupKeyOf(otherCondition(condition));
  const droppedIds = when(condition === "exclude", includedIdsIn(filter, group.ingredientIds));
  const { filter: toggled, absorbedIds } = toggleGroupCondition(
    {
      ...filter,
      [otherKey]: filter[otherKey].filter((code) => code !== group.code),
      includeIngredientIds: filter.includeIngredientIds.filter((id) => !droppedIds.includes(id)),
    },
    condition,
    group,
  );
  return {
    ...resolution(toggled, { movedGroupCodes: when(filter[otherKey].includes(group.code), [group.code]), droppedIds }),
    absorbedIds,
  };
};

/** 자주 피하는 성분을 켠다. 그 안의 성분이 원하는 성분에 있으면 원하는 성분에서 뺀다(S35 · S35a). */
export const addExcludeCode = (
  filter: Filter,
  code: Filter["excludeCodes"][number],
  ingredientIds: readonly number[],
): ConditionResolution => {
  const droppedIds = includedIdsIn(filter, ingredientIds);
  return resolution(
    {
      ...filter,
      excludeCodes: [...filter.excludeCodes, code],
      includeIngredientIds: filter.includeIngredientIds.filter((id) => !droppedIds.includes(id)),
    },
    { droppedIds },
  );
};

/** filter_conflict_shown 의 속성. 부딪힌 성분군 수와 정리한 성분 수다. */
export const resolutionCounts = (resolved: ConditionResolution) => ({
  conflict_count: Math.max(1, resolved.releasedCodes.length + resolved.movedGroupCodes.length),
  ingredient_count: Math.max(1, resolved.movedIds.length + resolved.droppedIds.length),
});

const CONDITION_TITLE: Record<IngredientCondition, string> = { include: "원하는 성분", exclude: "피하고 싶은 성분" };

export type ResolutionNames = {
  /** 담은 것(성분, 성분군, 자주 피하는 성분)의 이름 */
  readonly target: string;
  readonly ingredient: (id: number) => string;
  readonly group: (code: string) => string;
};

const subjectOf = (names: readonly string[]): string => {
  if (names.length > 1) return `${names[0]} 외 ${names.length - 1}개`;
  return names[0] ?? "";
};

/**
 * 정리한 것을 알리는 안내 줄 문구(S33 · S33a · S35 · S35a). 정리한 것이 없으면 빈 문자열이다.
 * condition 은 담은 쪽이다. 옮겨 온 것은 반대쪽 이름으로 알린다.
 */
export const resolutionMessage = (
  resolved: ConditionResolution,
  condition: IngredientCondition,
  names: ResolutionNames,
): string => {
  const moved = [...resolved.movedGroupCodes.map(names.group), ...resolved.movedIds.map(names.ingredient)];
  const released = resolved.releasedCodes.map(names.group).join("’, ‘");
  const dropped = resolved.droppedIds.map(names.ingredient);
  return [
    ...when(moved.length > 0, [
      `${withJosa(subjectOf(moved), "을/를")} ${CONDITION_TITLE[otherCondition(condition)]}에서 빼고 여기에 담았어요.`,
    ]),
    ...when(released.length > 0, [`${withJosa(names.target, "을/를")} 담으려고 ‘${released}’ 피하기를 풀었어요.`]),
    ...when(dropped.length > 0, [
      `${withJosa(subjectOf(dropped), "은/는")} ‘${names.target}’에 들어 있어 원하는 성분에서 뺐어요.`,
    ]),
  ].join(" ");
};

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
