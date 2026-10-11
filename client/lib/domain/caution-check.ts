import type { ExcludeCodeResponse, ExcludeGroupResponse } from "@poudy/api/api.zod";

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

/** 주의 성분 기준에 성분군 코드와 이 제품의 해당 성분을 붙인 것. 시트를 열 때 쓴다. */
export type CautionGroup = ExcludeGroupResponse & {
  /** 성분군 코드. 찾지 못하면 비워 두고, 그 기준은 누를 수 없게 둔다. */
  readonly code?: string;
  /** 이 제품의 성분 가운데 이 기준에 드는 것의 ID. 제품의 성분 순서를 따른다. */
  readonly ingredientIds: readonly number[];
};

/**
 * 제품 상세의 주의 성분 기준에 성분군 코드를 붙인다.
 *
 * 제품 상세 응답에는 기준의 이름만 있고 코드가 없다(#648). 제외 성분군 목록(`/api/exclude-codes`)에서
 * 같은 이름을 찾아 코드와 포함 성분을 얻는다. 두 응답 모두 서버의 같은 이름 칸을 쓰므로 이름이 같다.
 * 응답에 코드가 생기면 이 매칭은 지운다.
 */
export const withCautionCodes = (
  groups: readonly ExcludeGroupResponse[],
  excludeCodes: readonly ExcludeCodeResponse[],
  productIngredientIds: readonly number[],
): readonly CautionGroup[] =>
  groups.map((group) => {
    const match = excludeCodes.find((excludeCode) => excludeCode.name === group.name);
    if (!match) return { ...group, ingredientIds: [] };

    const members = new Set(match.ingredients.map((ingredient) => ingredient.id));
    return { ...group, code: match.code, ingredientIds: productIngredientIds.filter((id) => members.has(id)) };
  });
