import type { RoutineResponse } from "@poudy/api/api.zod";

import type { EventMap, FeatureFlow, RoutineAnalyticsProperties } from "./events";
import { newFeatureFlow, readFeatureFlow, rememberFeatureFlow } from "./feature-flow";
import { track } from "./track";

type Products = Pick<RoutineResponse, "morning" | "evening">;

export const routineProperties = (routine: RoutineResponse): RoutineAnalyticsProperties => ({
  routine_id: routine.id,
  product_count: routine.morning.length + routine.evening.length,
  morning_count: routine.morning.length,
  evening_count: routine.evening.length,
  is_public: routine.isPublic,
});

export const routineFlow = (routineId: number | "create"): FeatureFlow => {
  const previous = readFeatureFlow("routine", routineId);
  if (previous) return previous;
  const flow = newFeatureFlow("routine", routineId === "create" ? "create" : "direct");
  rememberFeatureFlow("routine", routineId, flow);
  return flow;
};

export const startRoutineCreation = (): void => {
  const flow = newFeatureFlow("routine", "create");
  rememberFeatureFlow("routine", "create", flow);
  track("routine_create_started", flow);
};

export const rememberRoutineEntry = (
  routine: Pick<RoutineResponse, "id" | "morning" | "evening">,
  flow: FeatureFlow,
): void => {
  const previous = readFeatureFlow("routine", routine.id);
  const empty = routine.morning.length + routine.evening.length === 0;
  if (empty && previous?.entry_source === "create") return;
  rememberFeatureFlow("routine", routine.id, flow);
};

const productIds = (routine: Products): string =>
  JSON.stringify([routine.morning.map((p) => p.id), routine.evening.map((p) => p.id)]);
export const routineChange = (
  before: Products,
  after: Products,
): EventMap["routine_products_updated"]["action"] | undefined => {
  if (productIds(before) === productIds(after)) return undefined;
  const previousCount = before.morning.length + before.evening.length;
  const count = after.morning.length + after.evening.length;
  if (count > previousCount) return "add";
  if (count < previousCount) return "remove";
  const ids = (routine: Products) =>
    [...routine.morning, ...routine.evening]
      .map((p) => p.id)
      .sort((a, b) => a - b)
      .join(",");
  if (ids(before) !== ids(after)) return "replace";
  return before.morning.length === after.morning.length ? "reorder" : "move";
};

export const trackRoutineProducts = (before: RoutineResponse, after: RoutineResponse): void => {
  const action = routineChange(before, after);
  if (!action) return;
  track("routine_products_updated", {
    ...routineFlow(after.id),
    ...routineProperties(after),
    action,
    previous_product_count: before.morning.length + before.evening.length,
  });
};
