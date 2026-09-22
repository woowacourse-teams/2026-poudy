/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const register = vi.fn();
const posthogCapture = vi.fn();
const captureException = vi.fn();
const trackGoogleAnalytics = vi.fn();

vi.mock("posthog-js", () => ({ default: { capture: posthogCapture, captureException, init, register } }));
vi.mock("./google-analytics", () => ({ trackGoogleAnalytics }));

const APP_INFO = {
  is_app: true,
  platform: "ios",
  app_version: "0.1.0",
  os_version: "18.2",
  device_model: "iPhone 15",
};

/**
 * track 은 모듈을 읽는 시점에 환경 변수를 읽어 보낼지 정한다.
 * 환경을 바꿔 가며 확인해야 하므로 테스트마다 모듈을 새로 가져온다.
 */
const load = async (environment: string, key?: string) => {
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment);
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
  if (key === undefined) vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  else vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);

  vi.resetModules();
  return import("./track");
};

const capture = vi.fn();

beforeEach(() => {
  capture.mockClear();
  captureException.mockClear();
  init.mockClear();
  posthogCapture.mockClear();
  register.mockClear();
  trackGoogleAnalytics.mockClear();
  window.sessionStorage.clear();
  window.posthog = { capture, captureException: vi.fn() };
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.posthog;
  delete window.__POUDY_APP__;
});

describe("track", () => {
  it("운영 환경에서는 속성에 environment 를 붙여 보낸다", async () => {
    const { track } = await load("production", "phc_test");

    track("search_used", { mode: "ingredient", query: "판테놀", query_length: 3, result_count: 7 });

    expect(capture).toHaveBeenCalledWith("search_used", {
      mode: "ingredient",
      query: "판테놀",
      query_length: 3,
      result_count: 7,
      analytics_schema_version: 2,
      environment: "production",
    });
  });

  it("개발 환경에서는 보내지 않는다", async () => {
    const { track } = await load("development", "phc_test");

    track("page_viewed", { page: "home" });

    expect(capture).not.toHaveBeenCalled();
  });

  it("키가 없으면 보내지 않는다", async () => {
    const { track } = await load("production");

    track("page_viewed", { page: "home" });

    expect(capture).not.toHaveBeenCalled();
  });

  it("PostHog 키와 관계없이 GA4 전송을 독립적으로 호출한다", async () => {
    const { track } = await load("production");

    track("product_saved", { product_id: 42, save_source: "product_detail" });

    expect(capture).not.toHaveBeenCalled();
    expect(trackGoogleAnalytics).toHaveBeenCalledWith("product_saved", {
      product_id: 42,
      save_source: "product_detail",
    });
  });
});

describe("initAnalytics", () => {
  beforeEach(() => {
    delete window.posthog;
  });

  it("초기화 호출 직후 첫 화면 이벤트를 보낸다", async () => {
    const { initAnalytics, track } = await load("production", "phc_test");

    void initAnalytics();
    track("page_viewed", { page: "home" });

    expect(posthogCapture).toHaveBeenCalledWith("page_viewed", {
      page: "home",
      analytics_schema_version: 2,
      environment: "production",
    });
  });

  it("같은 검색 탐색 ID를 결과·상세·보관까지 이어 붙인다", async () => {
    const { initAnalytics, track } = await load("production", "phc_test");
    initAnalytics();

    track("search_started", { mode: "product" });
    const started = posthogCapture.mock.calls[0]?.[1] as Record<string, unknown>;
    track("search_results_viewed", {
      mode: "product",
      result_count: 2,
      include_count: 0,
      exclude_count: 0,
      exclude_group_count: 0,
    });
    track("product_viewed", { product_id: 42, entry_point: "search_results" });
    track("product_saved", { product_id: 42, save_source: "product_detail", entry_point: "search_results" });

    expect(started).toMatchObject({ discovery_method: "search", origin_surface: "search" });
    expect(started.discovery_id).toEqual(expect.any(String));
    for (const call of posthogCapture.mock.calls.slice(1)) {
      expect(call[1]).toMatchObject({
        discovery_id: started.discovery_id,
        discovery_method: "search",
        origin_surface: "search",
      });
    }
  });

  it("다른 진입 경로에는 직전 탐색 ID를 잘못 붙이지 않는다", async () => {
    const { initAnalytics, track } = await load("production", "phc_test");
    initAnalytics();

    track("category_selected", { category_id: 11, origin_surface: "home" });
    track("product_viewed", { product_id: 42, entry_point: "home_ranking" });

    expect(posthogCapture.mock.calls[1]?.[1]).not.toHaveProperty("discovery_id");
  });

  it("빈 호스트는 프록시 경로를 쓰고 경로 변경 페이지뷰를 수집한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    const { initAnalytics } = await load("production", "phc_test");

    initAnalytics();

    expect(init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "/ingest",
        autocapture: false,
        capture_pageleave: true,
        capture_pageview: "history_change",
      }),
    );
  });

  it("SDK 가 딸린 script 를 본문이 아니라 머리에 붙이게 한다", async () => {
    const { initAnalytics } = await load("production", "phc_test");

    initAnalytics();

    expect(init).toHaveBeenCalledWith("phc_test", expect.objectContaining({ external_scripts_inject_target: "head" }));
  });

  it("앱에서 열면 앱 정보를 모든 이벤트에 붙인다", async () => {
    window.__POUDY_APP__ = APP_INFO;
    const { initAnalytics } = await load("production", "phc_test");

    initAnalytics();

    expect(register).toHaveBeenCalledWith(APP_INFO);
  });

  it("웹 브라우저로 열면 is_app 만 거짓으로 등록한다", async () => {
    const { initAnalytics } = await load("production", "phc_test");

    initAnalytics();

    expect(register).toHaveBeenCalledWith({ is_app: false });
  });

  it("정해진 모양이 아니면 웹으로 본 것과 같이 다룬다", async () => {
    window.__POUDY_APP__ = { ...APP_INFO, platform: "windows" };
    const { initAnalytics } = await load("production", "phc_test");

    initAnalytics();

    expect(register).toHaveBeenCalledWith({ is_app: false });
  });

  it("앱이 심은 다른 값은 등록하지 않는다", async () => {
    window.__POUDY_APP__ = { ...APP_INFO, user_id: "1234" };
    const { initAnalytics } = await load("production", "phc_test");

    await initAnalytics();

    expect(register).toHaveBeenCalledWith(APP_INFO);
  });
});
