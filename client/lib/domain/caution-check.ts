import type { ExcludeGroupResponse, IngredientGroupResponse } from "@poudy/api/api.zod";

/**
 * 기준을 공개 전성분에 '들어 있어요'와 '찾지 못했어요'로 나눈다. 같은 쪽끼리는 서버가 준 순서를 지킨다.
 */
export const partitionCautions = <T extends ExcludeGroupResponse>(
  groups: readonly T[],
): { readonly contained: readonly T[]; readonly missing: readonly T[] } => ({
  contained: groups.filter((group) => group.contains),
  missing: groups.filter((group) => !group.contains),
});

/** 주의 성분 기준에 이 제품의 해당 성분을 붙인 것. 시트를 열 때 쓴다. */
export type CautionGroup = ExcludeGroupResponse & {
  /** 이 제품의 성분 가운데 이 기준에 드는 것의 ID. 제품의 성분 순서를 따른다. */
  readonly ingredientIds: readonly number[];
};

/**
 * 제품 상세의 주의 성분 기준에 이 제품에 든 해당 성분을 붙인다.
 *
 * 빠른 제외 성분군 목록(`/api/ingredient-groups?type=QUICK_EXCLUDE`)에서 같은 코드의 포함 성분을 얻는다.
 * 시트를 여는 코드는 제품 상세 응답의 것을 그대로 쓴다.
 */
export const withCautionIngredients = (
  groups: readonly ExcludeGroupResponse[],
  excludeCodes: readonly IngredientGroupResponse[],
  productIngredientIds: readonly number[],
): readonly CautionGroup[] =>
  groups.map((group) => {
    const match = excludeCodes.find((excludeCode) => excludeCode.code === group.code);
    if (!match) return { ...group, ingredientIds: [] };

    const members = new Set(match.ingredients.map((ingredient) => ingredient.id));
    return { ...group, ingredientIds: productIngredientIds.filter((id) => members.has(id)) };
  });
