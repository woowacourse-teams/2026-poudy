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

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** 개발 환경의 이벤트가 운영 지표에 섞이지 않게 구분한다. */
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT ?? "development";

const posthogEnabled = key !== undefined && key !== "" && environment !== "development";

const ANALYTICS_SCHEMA_VERSION = 3;

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
  if (event === "product_viewed" || event === "product_saved" || event === "product_unsaved") {
    const entryPoint = (properties as EventMap["product_viewed"] | EventMap["product_saved"]).entry_point;
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

/**
 * 화면은 이 함수만 부르고 PostHog SDK 를 직접 쓰지 않는다.
 * 도구를 바꿀 때 고칠 곳이 한 군데로 모인다.
 */
export const track = <T extends EventName>(event: T, properties: EventMap[T], options?: TrackOptions): void => {
  const enriched = { ...properties, ...discoveryOf(event, properties) } as EventMap[T];
  if (posthogEnabled) {
    const payload = { ...enriched, analytics_schema_version: ANALYTICS_SCHEMA_VERSION, environment };
    if (options?.beacon) window.posthog?.capture(event, payload, { send_instantly: true, transport: "sendBeacon" });
    else window.posthog?.capture(event, payload);
  }
  trackGoogleAnalytics(event, enriched);
};

export const initAnalytics = (): void => {
  if (!posthogEnabled || !key || typeof window === "undefined" || window.posthog) return;
  deferPosthog(key);
};
