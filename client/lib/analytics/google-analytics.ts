"use client";

import { sendGAEvent } from "@next/third-parties/google";

import type { EventMap, EventName } from "./events";

const enabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENVIRONMENT === "production" && Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

const browserAllowsTracking = (): boolean => {
  const doNotTrack = navigator.doNotTrack?.toLowerCase();
  return doNotTrack !== "1" && doNotTrack !== "yes";
};

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
    ...ingredientCounts,
    result_count: properties.result_count,
    search_mode: properties.mode,
  });
};

const sendSearchResultsViewed = (properties: EventMap["search_results_viewed"]): void => {
  sendGAEvent("event", "search_results_viewed", {
    exclude_count: properties.exclude_count,
    exclude_group_count: properties.exclude_group_count,
    include_count: properties.include_count,
    result_count: properties.result_count,
    search_mode: properties.mode,
  });
};

const sendProductViewed = (properties: EventMap["product_viewed"]): void => {
  sendGAEvent("event", "view_item", {
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
    items: [{ item_id: String(properties.product_id) }],
    save_source: properties.save_source,
  });
};

/** 유입 퍼널에 필요한 핵심 행동만 GA4에도 전송한다. 검색어 원문은 보내지 않는다. */
export const trackGoogleAnalytics = <T extends EventName>(event: T, properties: EventMap[T]): void => {
  if (!enabled() || !browserAllowsTracking()) return;

  switch (event) {
    case "search_submitted":
      sendSearchSubmitted(properties as EventMap["search_submitted"]);
      break;
    case "search_results_viewed":
      sendSearchResultsViewed(properties as EventMap["search_results_viewed"]);
      break;
    case "product_viewed":
      sendProductViewed(properties as EventMap["product_viewed"]);
      break;
    case "product_saved":
      sendProductSaved(properties as EventMap["product_saved"]);
      break;
  }
};
