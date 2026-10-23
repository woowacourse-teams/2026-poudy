import { MyFilterResponse } from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPost } from "./client";

const PATH = "/api/users/me/my-filter";

/** 나만의 필터(검색에서 제외하는 성분)를 최근 추가순으로 받는다. */
export const fetchMyFilter = (): Promise<MyFilterResponse> => apiGet(PATH, MyFilterResponse, { withSession: true });

/** 고른 성분을 나만의 필터에 더한다. 이미 있는 성분은 그대로 둔다. */
export const addMyFilterIngredients = (ingredientIds: readonly number[]): Promise<void> =>
  apiPost(`${PATH}/ingredients`, { ingredientIds }, { withSession: true });

/** 고른 성분을 나만의 필터에서 뺀다. 필터에 없는 성분이어도 성공한다. */
export const removeMyFilterIngredients = (ingredientIds: readonly number[]): Promise<void> => {
  const query = new URLSearchParams();
  for (const id of ingredientIds) query.append("ingredientIds", String(id));
  return apiDelete(`${PATH}/ingredients`, query);
};
