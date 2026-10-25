import { MyFilterResponse } from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPost } from "./client";

import { createAnalyticsId, shelfJourneyProperties } from "@/lib/analytics/shelf-journey";
import { track } from "@/lib/analytics/track";

const PATH = "/api/users/me/my-filter";

/** 나만의 필터(검색에서 제외하는 성분)를 최근 추가순으로 받는다. */
export const fetchMyFilter = (): Promise<MyFilterResponse> => apiGet(PATH, MyFilterResponse, { withSession: true });

type FilterMutationOptions = {
  readonly source?: "shelf_filter" | "filter_management";
  readonly reason?: "normal" | "undo";
  readonly selectionChanged?: boolean;
  readonly analysisRevision?: string;
};
const propertiesOf = (ids: readonly number[], options: FilterMutationOptions) => ({
  ...shelfJourneyProperties(),
  source: options.source ?? "filter_management",
  mutation_reason: options.reason ?? "normal",
  selected_count: new Set(ids).size,
  operation_id: createAnalyticsId(),
  ...(options.analysisRevision ? { analysis_revision: options.analysisRevision } : {}),
  ...(options.selectionChanged === undefined ? {} : { selection_changed: options.selectionChanged }),
});

/** 고른 성분을 나만의 필터에 더한다. 이미 있는 성분은 그대로 둔다. */
export const addMyFilterIngredients = (
  ingredientIds: readonly number[],
  options: FilterMutationOptions = {},
): Promise<void> => {
  const properties = propertiesOf(ingredientIds, options);
  return apiPost(`${PATH}/ingredients`, { ingredientIds }, { withSession: true }).then(() => {
    if (properties.selected_count > 0) track("my_filter_updated", { ...properties, action: "add" });
  });
};

/** 고른 성분을 나만의 필터에서 뺀다. 필터에 없는 성분이어도 성공한다. */
export const removeMyFilterIngredients = (
  ingredientIds: readonly number[],
  options: FilterMutationOptions = {},
): Promise<void> => {
  const properties = propertiesOf(ingredientIds, options);
  const query = new URLSearchParams();
  for (const id of ingredientIds) query.append("ingredientIds", String(id));
  return apiDelete(`${PATH}/ingredients`, query).then(() => {
    if (properties.selected_count > 0) track("my_filter_updated", { ...properties, action: "remove" });
  });
};
