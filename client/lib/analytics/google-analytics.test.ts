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
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "search_submitted", {
      result_count: 3,
      search_mode: "product",
    });
  });

  it("검색 시작에 탐색 경로를 함께 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("search_started", {
      mode: "product",
      discovery_id: "journey-1",
      discovery_method: "search",
      origin_surface: "search",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "search_started", {
      discovery_id: "journey-1",
      discovery_method: "search",
      origin_surface: "search",
      search_mode: "product",
    });
  });

  it("홈 검색 진입을 실제 검색 시작과 분리해 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("home_search_selected", {
      placement: "top_bar",
      discovery_id: "journey-home-search",
      discovery_method: "search",
      origin_surface: "home",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "home_search_selected", {
      discovery_id: "journey-home-search",
      discovery_method: "search",
      origin_surface: "home",
      placement: "top_bar",
    });
  });

  it("카테고리 선택을 경로 시작 이벤트로 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("category_selected", {
      category_id: 11,
      category_name: "스킨케어",
      origin_surface: "home",
      discovery_id: "journey-2",
      discovery_method: "category",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "category_selected", {
      category_id: "11",
      category_name: "스킨케어",
      discovery_id: "journey-2",
      discovery_method: "category",
      origin_surface: "home",
    });
  });

  it("검색 결과 조회에 결과 수와 조건 수를 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("search_results_viewed", {
      mode: "ingredient",
      query: "판테놀",
      result_count: 7,
      include_count: 1,
      exclude_count: 2,
      exclude_group_count: 3,
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "search_results_viewed", {
      exclude_count: 2,
      exclude_group_count: 3,
      include_count: 1,
      result_count: 7,
      search_mode: "ingredient",
    });
  });

  it("인기 검색어 원문 없이 목록 도달 경로를 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("popular_keyword_used", {
      keyword: "민감할 수 있는 검색어",
      rank: 2,
      placement: "expanded",
      discovery_id: "journey-keyword",
      discovery_method: "popular_keyword",
      origin_surface: "home",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "popular_keyword_used", {
      discovery_id: "journey-keyword",
      discovery_method: "popular_keyword",
      origin_surface: "home",
      placement: "expanded",
      rank: 2,
    });
  });

  it("제품 목록 도달을 경로와 결과 수로 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("product_list_viewed", {
      source: "skin_type",
      result_count: 8,
      condition_count: 1,
      discovery_id: "journey-skin",
      discovery_method: "skin_type",
      origin_surface: "home",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "product_list_viewed", {
      condition_count: 1,
      discovery_id: "journey-skin",
      discovery_method: "skin_type",
      list_source: "skin_type",
      origin_surface: "home",
      result_count: 8,
    });
  });

  it("홈 랭킹 제품 선택을 GA4 권장 이벤트로 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("home_product_selected", {
      product_id: 42,
      position: 3,
      ranking_scope: "category",
      category_id: 11,
      discovery_id: "journey-ranking",
      discovery_method: "home_ranking",
      origin_surface: "home",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "select_item", {
      discovery_id: "journey-ranking",
      discovery_method: "home_ranking",
      origin_surface: "home",
      item_list_name: "home_category",
      items: [{ index: 3, item_category_id: "11", item_id: "42" }],
      ranking_scope: "category",
    });
  });

  it("제품 조회를 GA4 권장 이벤트로 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("product_viewed", {
      product_id: 42,
      category: "skin",
      entry_point: "search_results",
    });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "view_item", {
      entry_point: "search_results",
      items: [{ item_category: "skin", item_id: "42" }],
    });
  });

  it("제품 저장을 GA4 권장 이벤트로 전송한다", async () => {
    const { trackGoogleAnalytics } = await load();

    trackGoogleAnalytics("product_saved", { product_id: 42, save_source: "product_detail" });

    expect(sendGAEvent).toHaveBeenCalledWith("event", "add_to_wishlist", {
      items: [{ item_id: "42" }],
      save_source: "product_detail",
    });
  });

  it("퍼널 대상이 아닌 상세 행동은 전송하지 않는다", async () => {
    const { trackGoogleAnalytics } = await load();

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
