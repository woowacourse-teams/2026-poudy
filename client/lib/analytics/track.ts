"use client";

import { deferPosthog } from "./deferred-posthog";
import {
  beginDiscovery,
  beginHomeSearchDiscovery,
  discoveryMethodOf,
  readDiscovery,
  startSearchDiscovery,
} from "./discovery";
import type { DiscoveryContext, EventMap, EventName, ProductEntryPoint } from "./events";
import { trackGoogleAnalytics } from "./google-analytics";
import { analyticsAuthState } from "./identity";
import { readPageEntry } from "./page-entry";
import { readProductEntry } from "./product-entry";
import { readShelfJourney, shelfJourneyProperties } from "./shelf-journey";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** 개발 환경의 이벤트가 운영 지표에 섞이지 않게 구분한다. */
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT ?? "development";

const posthogEnabled = key !== undefined && key !== "" && environment !== "development";

export const ANALYTICS_SCHEMA_VERSION = 4;

let prepareNavigation: () => Promise<void> = async () => {};

/** beacon 이벤트를 담은 큐가 SDK에 전달된 뒤 외부로 이동한다. */
export const flushAnalyticsBeforeNavigation = (): Promise<void> => prepareNavigation();

const discoveryOf = <T extends EventName>(event: T, properties: EventMap[T]): DiscoveryContext | undefined => {
  if (event === "home_search_selected") return beginHomeSearchDiscovery();
  if (event === "search_started") return startSearchDiscovery();
  if (event === "popular_keyword_used") return beginDiscovery("popular_keyword", "home");
  if (event === "skin_type_selected") return beginDiscovery("skin_type", "home");
  if (event === "home_product_selected") return beginDiscovery("home_ranking", "home");
  if (event === "category_selected") {
    const origin = (properties as EventMap["category_selected"]).origin_surface;
    return beginDiscovery("category", origin);
  }
  if (["search_used", "search_suggestion_selected", "search_submitted", "search_results_viewed"].includes(event)) {
    return readDiscovery("search");
  }
  if (event === "product_list_viewed") {
    const source = (properties as EventMap["product_list_viewed"]).source;
    const method = source === "popular_keyword" || source === "skin_type" || source === "category" ? source : undefined;
    return method ? readDiscovery(method) : undefined;
  }
  if (event === "product_viewed" || event === "wishlist_product_added" || event === "wishlist_product_removed") {
    const entryPoint = (properties as EventMap["product_viewed"] | EventMap["wishlist_product_added"]).entry_point;
    const method = entryPoint ? discoveryMethodOf(entryPoint as ProductEntryPoint) : undefined;
    return method ? readDiscovery(method) : undefined;
  }
  return undefined;
};

export type TrackOptions = {
  /**
   * 화면을 떠나는 순간에 보내는 이벤트는 모아 두지 않고 바로 비콘으로 보낸다.
   * PostHog 가 pagehide 에서 대기열을 비운 뒤에 쌓인 이벤트는 전송되지 않는다.
   */
  readonly beacon?: boolean;
};

const attributeEntry = <T extends EventName>(event: T, properties: EventMap[T]): EventMap[T] => {
  const attributed: { -readonly [K in keyof EventMap[T]]: EventMap[T][K] } = { ...properties };
  const productEvent =
    event === "product_viewed" ||
    event === "shelf_product_added" ||
    event === "shelf_product_removed" ||
    ((event === "wishlist_product_added" || event === "wishlist_product_removed") &&
      "source" in properties &&
      properties.source === "product_detail");
  if (
    productEvent &&
    "product_id" in attributed &&
    typeof attributed.product_id === "number" &&
    "entry_point" in attributed &&
    attributed.entry_point === "direct"
  ) {
    attributed.entry_point = readProductEntry(attributed.product_id, "direct");
  }
  if (event === "product_list_viewed" && "source" in attributed) {
    const source = readPageEntry();
    if (source === "popular_keyword" || source === "skin_type") attributed.source = source;
  }
  return attributed as EventMap[T];
};
const journeyOf = (event: EventName, properties: object) => {
  const journey = readShelfJourney();
  const scoped =
    (event.startsWith("shelf_") && event !== "shelf_entry_viewed") ||
    event === "my_filter_updated" ||
    ((event.startsWith("login_") || event === "signup_completed") &&
      journey?.loginRequested &&
      "login_source" in properties &&
      properties.login_source === "shelf");
  return scoped ? shelfJourneyProperties(journey) : {};
};
const sendPosthog = (event: EventName, properties: object, options?: TrackOptions): void => {
  if (!posthogEnabled) return;
  const payload = { ...properties, analytics_schema_version: ANALYTICS_SCHEMA_VERSION, environment };
  try {
    if (options?.beacon) window.posthog?.capture(event, payload, { send_instantly: true, transport: "sendBeacon" });
    else window.posthog?.capture(event, payload);
  } catch {
    // 분석 도구 오류가 서버에서 이미 성공한 저장을 실패로 바꾸지 않게 한다.
  }
};

/** 화면은 이 함수만 부르고, 전송할 때 사용자·탐색·선반 문맥을 함께 붙인다. */
export const track = <T extends EventName>(event: T, properties: EventMap[T], options?: TrackOptions): void => {
  const attributed = attributeEntry(event, properties);
  const enriched = {
    auth_state: analyticsAuthState(),
    ...journeyOf(event, attributed),
    ...attributed,
    ...discoveryOf(event, attributed),
  } as EventMap[T];
  sendPosthog(event, enriched, options);
  trackGoogleAnalytics(event, enriched);
};

export const initAnalytics = (): void => {
  if (!posthogEnabled || !key || typeof window === "undefined" || window.posthog) return;
  prepareNavigation = deferPosthog(key);
};
