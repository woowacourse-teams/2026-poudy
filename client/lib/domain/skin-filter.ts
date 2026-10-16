import type { IngredientAnalysisItemResponse, SkinFilterIngredientResponse } from "@poudy/api/api.zod";

import { withObjectParticle } from "./shelf";

/** 마이페이지 줄에 적는 나만의 필터 값(S55). */
export const filterCountLabel = (count: number): string => `성분 ${count}개`;

/** 성분 행 아래 줄. 제형 기능을 가운뎃점으로 잇는다. 없으면 빈 문자열이다. */
export const formulationRolesLine = (item: SkinFilterIngredientResponse): string =>
  item.formulationRoles.map((role) => role.name).join(" · ");

/** 성분을 뺀 직후 토스트 문구(S55j-1). */
export const removedMessage = (name: string): string => `${withObjectParticle(name)} 필터에서 뺐어요`;

/** 선반에서 찾았지만 필터에 넣지 않은 성분. 필터에 든 성분은 뺀다. */
export const ingredientsNotInFilter = (
  suspects: readonly IngredientAnalysisItemResponse[],
  filter: readonly SkinFilterIngredientResponse[],
): readonly IngredientAnalysisItemResponse[] =>
  suspects.filter((suspect) => !filter.some((item) => item.id === suspect.id));

/** 뺀 성분을 원래 자리에 다시 넣는다. 자리가 목록보다 뒤면 끝에 둔다. */
export const insertedAt = <T>(items: readonly T[], index: number, item: T): readonly T[] => [
  ...items.slice(0, index),
  item,
  ...items.slice(index),
];
