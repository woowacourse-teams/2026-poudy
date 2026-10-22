import type { IngredientAnalysisItemResponse, SkinFilterIngredientResponse } from "@poudy/api/api.zod";

import { formatCount, withJosa } from "./format";

/** 마이페이지 줄에 적는 나만의 필터 값(S55). */
export const filterCountLabel = (count: number): string => `성분 ${formatCount(count)}`;

/** 성분을 뺀 직후 토스트 문구(S55j-1). */
export const removedMessage = (name: string): string => `${withJosa(name, "을/를")} 나만의 필터에서 뺐어요`;

/** 성분을 넣은 직후 토스트 문구(S55j-3). */
export const addedMessage = (name: string): string => `${withJosa(name, "을/를")} 나만의 필터에 넣었어요`;

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
