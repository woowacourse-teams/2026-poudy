/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
  setConfig: vi.fn(),
  create: vi.fn(),
}));
vi.mock("./after-page-load", () => ({ afterPageLoad: mocks.schedule }));
vi.mock("./posthog-client", () => ({ createPosthog: mocks.create }));

let originalPush: History["pushState"];
let originalReplace: History["replaceState"];

const load = async () => {
  vi.resetModules();
  const { deferPosthog } = await import("./deferred-posthog");
  deferPosthog("phc_test");
};
const start = async () => {
  mocks.schedule.mock.calls[0][0]();
  await vi.dynamicImportSettled();
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockReturnValue({
    capture: mocks.capture,
    captureException: mocks.captureException,
    set_config: mocks.setConfig,
  });
  originalPush = window.history.pushState;
  originalReplace = window.history.replaceState;
  window.history.replaceState(null, "", "/?utm_source=original");
  Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true });
});

afterEach(async () => {
  // 각 테스트에서 설치한 임시 이벤트 리스너도 SDK 인계로 정리한다.
  if (mocks.schedule.mock.calls.length && !mocks.setConfig.mock.calls.length) await start();
  window.history.pushState = originalPush;
  window.history.replaceState = originalReplace;
  delete window.posthog;
  vi.useRealTimers();
});

describe("deferPosthog", () => {
  it("스케줄러가 허용하기 전에는 SDK를 초기화하지 않는다", async () => {
    await load();
    await vi.dynamicImportSettled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(window.posthog).toBeDefined();
    await start();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.capture.mock.calls.map(([event]) => event)).toEqual(["$pageview"]);
    expect(mocks.setConfig).toHaveBeenCalledWith({ capture_pageview: "history_change", capture_pageleave: true });
  });

  it("이벤트 시각·페이지·순서를 보존하고 빠른 이동의 페이지뷰도 보낸다", async () => {
    await load();
    const capturedAt = new Date("2026-10-07T00:00:00Z");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(capturedAt);
    window.posthog?.capture("product_saved", { product_id: 42 });
    window.history.pushState(null, "", "/products/42");
    window.posthog?.capture("product_viewed", { product_id: 42 });
    vi.setSystemTime(new Date("2026-10-07T00:00:05Z"));
    await start();
    expect(mocks.capture.mock.calls.map(([event]) => event)).toEqual([
      "$pageview",
      "product_saved",
      "$pageview",
      "product_viewed",
    ]);
    expect(mocks.capture).toHaveBeenCalledWith(
      "product_saved",
      expect.objectContaining({
        $pathname: "/",
        $current_url: expect.stringContaining("utm_source=original"),
        product_id: 42,
      }),
      { timestamp: capturedAt },
    );
    expect(mocks.capture).toHaveBeenCalledWith(
      "product_viewed",
      expect.objectContaining({ $pathname: "/products/42" }),
      { timestamp: capturedAt },
    );
    mocks.capture.mockClear();
    window.history.pushState(null, "", "/saved");
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("대기 중 예외와 이탈 이벤트의 beacon 옵션을 보존한다", async () => {
    await load();
    const error = new Error("early error");
    window.posthog?.captureException(error, { surface: "home" });
    window.posthog?.capture(
      "detail_active_time_recorded",
      { active_seconds: 1 },
      { send_instantly: true, transport: "sendBeacon" },
    );
    await start();
    expect(mocks.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ surface: "home", $pathname: "/" }),
    );
    expect(mocks.capture).toHaveBeenCalledWith(
      "detail_active_time_recorded",
      expect.any(Object),
      expect.objectContaining({ send_instantly: true, transport: "sendBeacon" }),
    );
  });

  it("같은 URL replaceState에는 페이지뷰를 추가하지 않는다", async () => {
    await load();
    window.history.replaceState({ next: true }, "", window.location.href);
    window.history.pushState(null, "", "/?other=query#hash");
    await start();
    expect(mocks.capture.mock.calls.map(([event]) => event)).toEqual(["$pageview"]);
  });

  it.each(["1", "yes"])("DNT %s이면 큐와 SDK를 만들지 않는다", async (value) => {
    Object.defineProperty(navigator, "doNotTrack", { value, configurable: true });
    await load();
    expect(window.posthog).toBeUndefined();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("초기화 실패 후 다음 조작에서 재시도하고 대기 이벤트를 한 번만 보낸다", async () => {
    mocks.create.mockImplementationOnce(() => {
      throw new Error("chunk unavailable");
    });
    await load();
    window.posthog?.capture("page_viewed", { page: "home" });
    await start();
    expect(mocks.capture).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("pointerdown"));
    await vi.dynamicImportSettled();
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.capture.mock.calls.map(([event]) => event)).toEqual(["$pageview", "page_viewed"]);
  });
});
