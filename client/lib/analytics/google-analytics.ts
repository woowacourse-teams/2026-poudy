"use client";

import { sendGAEvent } from "@next/third-parties/google";

import type { EventMap, EventName } from "./events";

const enabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENVIRONMENT === "production" && Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

const browserAllowsTracking = (): boolean => {
  const doNotTrack = navigator.doNotTrack?.toLowerCase();
  return doNotTrack !== "1" && doNotTrack !== "yes";
};

type FunnelProperties = {
  readonly discovery_method?: string;
  readonly origin_surface?: string;
};

const discoveryParameters = (properties: FunnelProperties): Record<string, string> => ({
  ...(properties.discovery_method ? { discovery_method: properties.discovery_method } : {}),
  ...(properties.origin_surface ? { origin_surface: properties.origin_surface } : {}),
});

const sendSearchSubmitted = (properties: EventMap["search_submitted"]): void => {
  const ingredientCounts =
    properties.mode === "ingredient"
      ? {
          exclude_count: properties.exclude_count,
          exclude_group_count: properties.exclude_group_count,
          include_count: properties.include_count,
        }
      : {};

  sendGAEvent("event", "search_submitted", {
    ...discoveryParameters(properties),
    ...ingredientCounts,
    result_count: properties.result_count,
    search_mode: properties.mode,
  });
};

const sendProductViewed = (properties: EventMap["product_viewed"]): void => {
  sendGAEvent("event", "view_item", {
    ...discoveryParameters(properties),
    entry_point: properties.entry_point,
    items: [
      {
        item_category: properties.category,
        item_id: String(properties.product_id),
      },
    ],
  });
};

const sendProductSaved = (properties: EventMap["product_saved"]): void => {
  sendGAEvent("event", "add_to_wishlist", {
    ...discoveryParameters(properties),
    ...(properties.entry_point ? { entry_point: properties.entry_point } : {}),
    items: [{ item_id: String(properties.product_id) }],
    save_source: properties.save_source,
  });
};

const sendAcquisitionOutcome = <T extends EventName>(event: T, properties: EventMap[T]): void => {
  switch (event) {
    case "search_submitted":
      sendSearchSubmitted(properties as EventMap["search_submitted"]);
      break;
    case "product_viewed":
      sendProductViewed(properties as EventMap["product_viewed"]);
      break;
    case "product_saved":
      sendProductSaved(properties as EventMap["product_saved"]);
      break;
  }
};

/** 획득 채널의 품질을 평가할 핵심 도달점만 GA4에도 전송한다. 제품 안의 세부 행동은 PostHog에 남긴다. */
export const trackGoogleAnalytics = <T extends EventName>(event: T, properties: EventMap[T]): void => {
  if (!enabled() || !browserAllowsTracking()) return;
  sendAcquisitionOutcome(event, properties);
};
