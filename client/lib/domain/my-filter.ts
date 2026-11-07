import type { IngredientAnalysisItemResponse, MyFilterIngredientResponse } from "@poudy/api/api.zod";

import { formatCount, withJosaShort } from "./format";

/** 마이페이지 줄에 적는 나만의 필터 값(S55). */
export const filterCountLabel = (count: number): string => `성분 ${formatCount(count)}`;

/** 성분을 뺀 직후 토스트 문구(S55j-1). 긴 성분명은 줄이고, 조사는 원래 이름을 따른다(W06 예외 ④). */
export const removedMessage = (name: string): string => `${withJosaShort(name, "을/를")} 나만의 필터에서 뺐어요`;

/** 성분을 넣은 직후 토스트 문구(S55j 넣기, S55j-1의 반대 방향). 이름은 뺄 때와 같이 줄인다. */
export const addedMessage = (name: string): string => `${withJosaShort(name, "을/를")} 나만의 필터에 넣었어요`;

/** 선반에서 찾았지만 필터에 넣지 않은 성분. 필터에 든 성분은 뺀다. */
export const ingredientsNotInFilter = (
  suspects: readonly IngredientAnalysisItemResponse[],
  filter: readonly MyFilterIngredientResponse[],
): readonly IngredientAnalysisItemResponse[] =>
  suspects.filter((suspect) => !filter.some((item) => item.id === suspect.id));

/** 뺀 성분을 원래 자리에 다시 넣는다. 자리가 목록보다 뒤면 끝에 둔다. */
export const insertedAt = <T>(items: readonly T[], index: number, item: T): readonly T[] => [
  ...items.slice(0, index),
  item,
  ...items.slice(index),
];
