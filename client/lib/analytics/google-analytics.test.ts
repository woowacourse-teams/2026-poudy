/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendGAEvent = vi.hoisted(() => vi.fn());

vi.mock("@next/third-parties/google", () => ({ sendGAEvent }));

const setDoNotTrack = (value: string | null): void => {
  Object.defineProperty(navigator, "doNotTrack", { configurable: true, value });
};

const load = async (environment = "production", measurementId = "G-TEST123") => {
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment);
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", measurementId);
  vi.resetModules();
  return import("./google-analytics");
};

beforeEach(() => {
  sendGAEvent.mockClear();
  setDoNotTrack(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("trackGoogleAnalytics", () => {
  it("제품 검색 결과를 검색어 원문 없이 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("search_submitted", {
      mode: "product",
      query: "민감할 수 있는 검색어",
      result_count: 3,
      discovery_id: "journey-search",
      discovery_method: "search",
      origin_surface: "search",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "search_submitted", {
      discovery_method: "search",
      origin_surface: "search",
      result_count: 3,
      search_mode: "product",
    });
  });

  it("제품 조회에 획득 분석에 필요한 낮은 카디널리티 경로만 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("product_viewed", {
      product_id: 42,
      category: "skin",
      entry_point: "search_results",
      discovery_id: "journey-1",
      discovery_method: "search",
      origin_surface: "search",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "view_item", {
      discovery_method: "search",
      entry_point: "search_results",
      items: [{ item_category: "skin", item_id: "42" }],
      origin_surface: "search",
    });
  });

  it("제품 저장을 GA4 권장 이벤트로 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("product_saved", {
      product_id: 42,
      save_source: "product_detail",
      entry_point: "search_results",
      discovery_id: "journey-save",
      discovery_method: "search",
      origin_surface: "search",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "add_to_wishlist", {
      discovery_method: "search",
      entry_point: "search_results",
      items: [{ item_id: "42" }],
      origin_surface: "search",
      save_source: "product_detail",
    });
  });

  it("제품 안의 세부 탐색 행동은 GA4로 복제하지 않는다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("home_search_selected", { placement: "top_bar" });
    trackGoogleAnalytics("search_started", { mode: "product" });
    trackGoogleAnalytics("category_selected", {
      category_id: 11,
      category_name: "스킨케어",
      origin_surface: "home",
    });
    trackGoogleAnalytics("search_results_viewed", {
      mode: "ingredient",
      query: "판테놀",
      result_count: 7,
      include_count: 1,
      exclude_count: 2,
      exclude_group_count: 3,
    });
    trackGoogleAnalytics("popular_keyword_used", {
      keyword: "민감할 수 있는 검색어",
      rank: 2,
      placement: "expanded",
    });
    trackGoogleAnalytics("skin_type_selected", { skin_type: "DRY" });
    trackGoogleAnalytics("product_list_viewed", {
      source: "skin_type",
      result_count: 8,
      condition_count: 1,
    });
    trackGoogleAnalytics("home_product_selected", {
      product_id: 42,
      position: 3,
      ranking_scope: "category",
      category_id: 11,
    });
    trackGoogleAnalytics("filter_reset", { filter_type: "ingredient" });

    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it.each([
    ["development", "G-TEST123"],
    ["production", ""],
  ])("환경이 %s이고 측정 ID가 %s이면 전송하지 않는다", async (environment, measurementId) => {
    const { trackGoogleAnalytics } = await load(environment, measurementId);

    trackGoogleAnalytics("product_saved", { product_id: 42, save_source: "product_detail" });

    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it.each(["1", "yes"])("Do Not Track 값이 %s이면 전송하지 않는다", async (doNotTrack) => {
    setDoNotTrack(doNotTrack);
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("product_saved", { product_id: 42, save_source: "product_detail" });

    expect(sendGAEvent).not.toHaveBeenCalled();
  });
});
