import type { Filter } from "./filter";

/** 성분군 코드에 속한 성분 ID 목록. 빠른 필터와 검색으로 고른 성분군 응답에서 만든다. */
export type ExcludeCodeIngredients = ReadonlyMap<string, readonly number[]>;

export type Conflict = {
  readonly code: string;
  readonly ingredientIds: readonly number[];
};

/**
 * 성분군을 통째로 제외해 두고 그 안의 성분을 포함 조건으로 고르면 결과가 반드시 비어 있다.
 * 서버도 CONFLICTING_INGREDIENT_FILTER 로 400 을 돌려주므로 화면에서 먼저 막는다.
 */
export const findConflicts = (filter: Filter, codeIngredients: ExcludeCodeIngredients): readonly Conflict[] =>
  [...filter.excludeCodes, ...filter.excludeGroupCodes]
    .map((code) => ({
      code,
      ingredientIds: (codeIngredients.get(code) ?? []).filter((id) => filter.includeIngredientIds.includes(id)),
    }))
    .filter((conflict) => conflict.ingredientIds.length > 0);

export const hasConflict = (filter: Filter, codeIngredients: ExcludeCodeIngredients): boolean =>
  findConflicts(filter, codeIngredients).length > 0;

/**
 * 같은 성분을 포함과 제외에 동시에 넣은 경우. 이쪽은 성분군과 무관하게 언제나 모순이다.
 */
export const findContradictingIngredientIds = (filter: Filter): readonly number[] =>
  filter.includeIngredientIds.filter((id) => filter.excludeIngredientIds.includes(id));

/**
 * 링크로 들어온 조건에서 원하는 성분 쪽을 뺀 한 건. 무엇과 부딪혔는지(code 는 성분군, 없으면 같은 성분의 제외)를 남겨
 * 안내 줄이 알리고 되돌릴 수 있게 한다.
 */
export type LinkCleanup = {
  readonly ingredientId: number;
  /** 부딪힌 자주 피하는 성분·성분군 코드. 같은 성분을 포함과 제외에 함께 넣은 경우는 없다. */
  readonly code?: string;
};

/**
 * 링크·주소로 들어온 조건이 서로 부딪히면 막지 않고 정리한다(명세 S36). 피하고 싶은 성분이 우선이라 원하는 성분 쪽을 뺀다.
 * 부딪히는 것이 없으면 받은 조건을 그대로 돌려준다.
 */
export const resolveLinkConflicts = (
  filter: Filter,
  codeIngredients: ExcludeCodeIngredients,
): { readonly filter: Filter; readonly removed: readonly LinkCleanup[] } => {
  const removed: readonly LinkCleanup[] = [
    ...findContradictingIngredientIds(filter).map((ingredientId) => ({ ingredientId })),
    ...findConflicts(filter, codeIngredients).flatMap((conflict) =>
      conflict.ingredientIds.map((ingredientId) => ({ ingredientId, code: conflict.code })),
    ),
  ];
  if (removed.length === 0) return { filter, removed };

  const removedIds = new Set(removed.map((cleanup) => cleanup.ingredientId));
  return {
    filter: { ...filter, includeIngredientIds: filter.includeIngredientIds.filter((id) => !removedIds.has(id)) },
    removed,
  };
};

/**
 * 정리를 반대로 한다(명세 S36 [대신 ○○ 남기기]). 뺀 원하는 성분을 되살리고, 부딪힌 피하기 조건을 뺀다.
 */
export const keepIncludedInstead = (filter: Filter, removed: readonly LinkCleanup[]): Partial<Filter> => {
  const ids = new Set(removed.map((cleanup) => cleanup.ingredientId));
  const codes = new Set(removed.map((cleanup) => cleanup.code).filter((code): code is string => Boolean(code)));

  return {
    includeIngredientIds: [...new Set([...filter.includeIngredientIds, ...ids])],
    excludeIngredientIds: filter.excludeIngredientIds.filter((id) => !ids.has(id)),
    excludeCodes: filter.excludeCodes.filter((code) => !codes.has(code)),
    excludeGroupCodes: filter.excludeGroupCodes.filter((code) => !codes.has(code)),
  };
};
