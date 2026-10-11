import type { ExcludeGroupResponse, ProductIngredientResponse } from "@poudy/api/api.zod";

export type CautionSummary = {
  /** 기준 가운데 하나라도 들어 있는지. 머리 문구의 색을 정한다. */
  readonly contains: boolean;
  readonly label: string;
};

/** 주의 성분 확인 머리의 오른쪽 문구. 들어 있는 기준이 없으면 모두 없다고 알린다. */
export const cautionSummary = (groups: readonly ExcludeGroupResponse[]): CautionSummary => {
  const containedCount = groups.filter((group) => group.contains).length;

  if (containedCount === 0) return { contains: false, label: `${groups.length}개 모두 없음` };
  return { contains: true, label: `${groups.length}개 중 ${containedCount}개 포함` };
};

/** 들어 있는 기준을 앞에 둔다. 같은 쪽끼리는 서버가 준 순서를 지킨다. */
export const sortedCautions = <T extends ExcludeGroupResponse>(groups: readonly T[]): readonly T[] => [
  ...groups.filter((group) => group.contains),
  ...groups.filter((group) => !group.contains),
];

/** 주의 성분 기준에 이 제품의 해당 성분을 붙인 것. 시트를 열 때 쓴다. */
export type CautionGroup = ExcludeGroupResponse & {
  /** 이 제품의 성분 가운데 이 기준에 드는 것의 ID. 제품의 성분 순서를 따른다. */
  readonly ingredientIds: readonly number[];
};

/**
 * 제품 상세의 주의 성분 기준에 이 제품에 든 해당 성분을 붙인다.
 *
 * 제품 상세 응답의 성분별 주의 기준 코드로 찾고 제품의 성분 순서를 유지한다.
 */
export const withCautionIngredients = (
  groups: readonly ExcludeGroupResponse[],
  ingredients: readonly Pick<ProductIngredientResponse, "id" | "cautions">[],
): readonly CautionGroup[] =>
  groups.map((group) => ({
    ...group,
    ingredientIds: ingredients
      .filter((ingredient) => ingredient.cautions.some((caution) => caution.code === group.code))
      .map((ingredient) => ingredient.id),
  }));
