import type { ExcludeCode, Filter } from "./filter";

/** 성분군 코드에 속한 성분 ID 목록. /api/exclude-codes 응답에서 만든다. */
export type ExcludeCodeIngredients = ReadonlyMap<ExcludeCode, readonly number[]>;

export type Conflict = {
  readonly code: ExcludeCode;
  readonly ingredientIds: readonly number[];
};

/**
 * 성분군을 통째로 제외해 두고 그 안의 성분을 포함 조건으로 고르면 결과가 반드시 비어 있다.
 * 서버도 CONFLICTING_INGREDIENT_FILTER 로 400 을 돌려주므로 화면에서 먼저 막는다.
 */
export const findConflicts = (filter: Filter, codeIngredients: ExcludeCodeIngredients): readonly Conflict[] =>
  filter.excludeCodes
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
