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
