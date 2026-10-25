"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";

import type { ProductEntryPoint, ShelfIntent, ShelfMutationSource, ShelfMutationProperties } from "./events";
import {
  createAnalyticsId,
  ensureShelfJourney,
  readShelfJourney,
  shelfJourneyProperties,
  updateShelfJourney,
} from "./shelf-journey";
import { track } from "./track";

import type { RatingDraft } from "@/lib/domain/shelf";

export const requestShelfLogin = (intent?: ShelfIntent): void => {
  ensureShelfJourney(intent);
  updateShelfJourney({ loginRequested: true, ...(intent ? { intent } : {}) });
  track("shelf_login_requested", { auth_state: "signed_out", ...shelfJourneyProperties() });
};
export const completeShelfIntent = (intent: ShelfIntent, productId?: number): void => {
  const journey = readShelfJourney();
  if (!journey?.loginSucceeded || journey.completed || journey.intent !== intent) return;
  if (intent !== "view_shelf" && journey.productId !== undefined && journey.productId !== productId) return;
  updateShelfJourney({ completed: true });
  track("shelf_intent_completed", {
    ...shelfJourneyProperties(journey),
    intent,
    ...(productId === undefined ? {} : { product_id: productId }),
    auth_state: "signed_in",
  });
};
export const shelfMutation = (
  source: ShelfMutationSource,
  productId: number,
  {
    reason = "normal",
    ratingFlowId,
    entryPoint,
  }: {
    readonly reason?: "normal" | "undo";
    readonly ratingFlowId?: string;
    readonly entryPoint?: ProductEntryPoint;
  } = {},
): ShelfMutationProperties => ({
  ...shelfJourneyProperties(),
  source,
  product_id: productId,
  mutation_reason: reason,
  operation_id: createAnalyticsId(),
  ...(ratingFlowId ? { rating_flow_id: ratingFlowId } : {}),
  auth_state: "signed_in",
  ...(source === "product_detail" ? { entry_point: entryPoint ?? "direct" } : {}),
});
export const trackShelfRating = (
  item: ShelfProductResponse,
  previous: RatingDraft | undefined,
  properties: ShelfMutationProperties,
): void => {
  const fields = (["preference", "moistureLevel", "oilLevel"] as const).filter(
    (field) => item.rating[field] !== (previous?.[field] ?? null),
  );
  if (fields.length > 0)
    track("shelf_rating_saved", {
      ...properties,
      changed_fields: fields,
      has_fit_rating: item.rating.preference !== null,
      has_sensory_rating: item.rating.moistureLevel !== null || item.rating.oilLevel !== null,
      was_unrated:
        previous !== undefined &&
        previous.preference === null &&
        previous.moistureLevel === null &&
        previous.oilLevel === null,
      fit_changed: fields.includes("preference"),
      sensory_changed: fields.some((field) => field !== "preference"),
    });
  if (previous && previous.usageStatus !== item.usageStatus)
    track("shelf_usage_status_changed", {
      ...properties,
      previous_status: previous.usageStatus,
      usage_status: item.usageStatus,
    });
};
export const trackShelfAdded = (item: ShelfProductResponse, properties: ShelfMutationProperties): void => {
  track("shelf_product_added", {
    ...properties,
    usage_status: item.usageStatus,
    has_fit_rating: item.rating.preference !== null,
    has_sensory_rating: item.rating.moistureLevel !== null || item.rating.oilLevel !== null,
    sensory_supported: item.product.sensorySupported,
    is_restore: properties.mutation_reason === "undo",
  });
  if (properties.mutation_reason !== "undo") {
    trackShelfRating(
      item,
      { usageStatus: item.usageStatus, preference: null, moistureLevel: null, oilLevel: null },
      properties,
    );
    completeShelfIntent("add_product", item.product.id);
  }
};
