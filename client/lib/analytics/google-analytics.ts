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
  readonly discovery_id?: string;
  readonly discovery_method?: string;
  readonly origin_surface?: string;
};

const discoveryParameters = (properties: FunnelProperties): Record<string, string> => ({
  ...(properties.discovery_id ? { discovery_id: properties.discovery_id } : {}),
  ...(properties.discovery_method ? { discovery_method: properties.discovery_method } : {}),
  ...(properties.origin_surface ? { origin_surface: properties.origin_surface } : {}),
});

const sendSearchStarted = (properties: EventMap["search_started"]): void => {
  sendGAEvent("event", "search_started", {
    ...discoveryParameters(properties),
    search_mode: properties.mode,
  });
};

const sendHomeSearchSelected = (properties: EventMap["home_search_selected"]): void => {
  sendGAEvent("event", "home_search_selected", {
    ...discoveryParameters(properties),
    placement: properties.placement,
  });
};

const sendPopularKeywordUsed = (properties: EventMap["popular_keyword_used"]): void => {
  sendGAEvent("event", "popular_keyword_used", {
    ...discoveryParameters(properties),
    placement: properties.placement,
    rank: properties.rank,
  });
};

const sendSkinTypeSelected = (properties: EventMap["skin_type_selected"]): void => {
  sendGAEvent("event", "skin_type_selected", {
    ...discoveryParameters(properties),
    skin_type: properties.skin_type,
  });
};

const sendCategorySelected = (properties: EventMap["category_selected"]): void => {
  sendGAEvent("event", "category_selected", {
    ...discoveryParameters(properties),
    category_id: String(properties.category_id),
    category_name: properties.category_name,
  });
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
    ...discoveryParameters(properties),
    ...ingredientCounts,
    result_count: properties.result_count,
    search_mode: properties.mode,
  });
};

const sendSearchResultsViewed = (properties: EventMap["search_results_viewed"]): void => {
  sendGAEvent("event", "search_results_viewed", {
    ...discoveryParameters(properties),
    exclude_count: properties.exclude_count,
    exclude_group_count: properties.exclude_group_count,
    include_count: properties.include_count,
    result_count: properties.result_count,
    search_mode: properties.mode,
  });
};

const sendProductListViewed = (properties: EventMap["product_list_viewed"]): void => {
  sendGAEvent("event", "product_list_viewed", {
    ...discoveryParameters(properties),
    condition_count: properties.condition_count,
    list_source: properties.source,
    result_count: properties.result_count,
  });
};

const sendHomeProductSelected = (properties: EventMap["home_product_selected"]): void => {
  sendGAEvent("event", "select_item", {
    ...discoveryParameters(properties),
    item_list_name: properties.ranking_scope === "overall" ? "home_ranking" : "home_category",
    items: [
      {
        index: properties.position,
        ...(properties.category_id === undefined ? {} : { item_category_id: String(properties.category_id) }),
        item_id: String(properties.product_id),
      },
    ],
    ranking_scope: properties.ranking_scope,
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

const sendDiscoveryStart = <T extends EventName>(event: T, properties: EventMap[T]): boolean => {
  switch (event) {
    case "home_search_selected":
      sendHomeSearchSelected(properties as EventMap["home_search_selected"]);
      return true;
    case "search_started":
      sendSearchStarted(properties as EventMap["search_started"]);
      return true;
    case "category_selected":
      sendCategorySelected(properties as EventMap["category_selected"]);
      return true;
    case "popular_keyword_used":
      sendPopularKeywordUsed(properties as EventMap["popular_keyword_used"]);
      return true;
    case "skin_type_selected":
      sendSkinTypeSelected(properties as EventMap["skin_type_selected"]);
      return true;
    case "home_product_selected":
      sendHomeProductSelected(properties as EventMap["home_product_selected"]);
      return true;
    default:
      return false;
  }
};

const sendDiscoveryOutcome = <T extends EventName>(event: T, properties: EventMap[T]): void => {
  switch (event) {
    case "search_submitted":
      sendSearchSubmitted(properties as EventMap["search_submitted"]);
      break;
    case "search_results_viewed":
      sendSearchResultsViewed(properties as EventMap["search_results_viewed"]);
      break;
    case "product_list_viewed":
      sendProductListViewed(properties as EventMap["product_list_viewed"]);
      break;
    case "product_viewed":
      sendProductViewed(properties as EventMap["product_viewed"]);
      break;
    case "product_saved":
      sendProductSaved(properties as EventMap["product_saved"]);
      break;
  }
};

/** 유입 퍼널에 필요한 핵심 행동만 GA4에도 전송한다. 검색어 원문은 보내지 않는다. */
export const trackGoogleAnalytics = <T extends EventName>(event: T, properties: EventMap[T]): void => {
  if (!enabled() || !browserAllowsTracking()) return;
  if (!sendDiscoveryStart(event, properties)) sendDiscoveryOutcome(event, properties);
};
