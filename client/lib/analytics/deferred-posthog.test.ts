/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsSession } from "./deferred-posthog";

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
  setConfig: vi.fn(),
  create: vi.fn(),
  onSession: vi.fn(() => vi.fn()),
}));
vi.mock("./after-page-load", () => ({ afterPageLoad: mocks.schedule }));
vi.mock("./posthog-client", () => ({ createPosthog: mocks.create }));

let originalPush: History["pushState"];
let originalReplace: History["replaceState"];

const load = async () => {
  vi.resetModules();
  const { deferPosthog } = await import("./deferred-posthog");
  return deferPosthog("phc_test");
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
    onSessionId: mocks.onSession,
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
  it("SDK와 대기 페이지뷰가 준비된 뒤에만 렌더링 후 측정 구독에 알린다", async () => {
    await load();
    const { afterAnalyticsReady } = await import("./deferred-posthog");
    const ready = vi.fn((client: AnalyticsSession) => {
      expect(client.onSessionId).toBe(mocks.onSession);
    });
    const unsubscribe = afterAnalyticsReady(ready);
    expect(ready).not.toHaveBeenCalled();
    await start();
    expect(ready).toHaveBeenCalledOnce();
    expect(mocks.capture).toHaveBeenCalledWith("$pageview", expect.any(Object), expect.any(Object));
    unsubscribe();
  });

  it("SDK가 준비된 뒤의 새 구독에도 즉시 알린다", async () => {
    await load();
    await start();
    const { afterAnalyticsReady } = await import("./deferred-posthog");
    const ready = vi.fn();
    afterAnalyticsReady(ready)();
    expect(ready).toHaveBeenCalledOnce();
  });

  it("준비 전에 해제한 구독은 SDK 로드 뒤에도 실행하지 않는다", async () => {
    await load();
    const { afterAnalyticsReady } = await import("./deferred-posthog");
    const ready = vi.fn();
    afterAnalyticsReady(ready)();
    await start();
    expect(ready).not.toHaveBeenCalled();
  });

  it("측정 구독의 예외를 SDK 로딩 실패로 보지 않고 다시 초기화하지 않는다", async () => {
    const errors: unknown[] = [];
    const microtask = vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    });
    try {
      await load();
      const { afterAnalyticsReady } = await import("./deferred-posthog");
      afterAnalyticsReady(() => {
        throw new Error("measurement");
      });
      await start();
      expect(errors).toEqual([new Error("measurement")]);
      window.dispatchEvent(new Event("pointerdown"));
      await vi.dynamicImportSettled();
      expect(mocks.create).toHaveBeenCalledOnce();
    } finally {
      microtask.mockRestore();
    }
  });

  it("외부 이동 준비는 스케줄러를 기다리지 않고 비콘 큐를 전송한다", async () => {
    const flush = await load();
    window.posthog?.capture(
      "app_store_redirected",
      { source: "qr_scan" },
      { send_instantly: true, transport: "sendBeacon" },
    );
    await flush();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.capture).toHaveBeenCalledWith(
      "app_store_redirected",
      expect.objectContaining({ source: "qr_scan" }),
      expect.objectContaining({ send_instantly: true, transport: "sendBeacon" }),
    );
    await start();
    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it("SDK 초기화 실패가 외부 이동을 막지 않는다", async () => {
    mocks.create.mockImplementationOnce(() => {
      throw new Error("unavailable");
    });
    const flush = await load();
    await expect(flush()).resolves.toBeUndefined();
  });

  it("SDK 다운로드가 멎어도 외부 이동 준비는 1초 뒤 끝난다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.doMock("./posthog-client", async () => {
      await gate;
      return { createPosthog: mocks.create };
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const flush = await load();
      const finished = vi.fn();
      const pending = flush().then(finished);
      await vi.advanceTimersByTimeAsync(999);
      expect(finished).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(finished).toHaveBeenCalledOnce();
      expect(mocks.create).not.toHaveBeenCalled();
    } finally {
      release();
      await vi.dynamicImportSettled();
      vi.doMock("./posthog-client", () => ({ createPosthog: mocks.create }));
    }
  });
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
    window.posthog?.capture("wishlist_product_added", { product_id: 42 });
    window.history.pushState(null, "", "/products/42");
    window.posthog?.capture("product_viewed", { product_id: 42 });
    vi.setSystemTime(new Date("2026-10-07T00:00:05Z"));
    await start();
    expect(mocks.capture.mock.calls.map(([event]) => event)).toEqual([
      "$pageview",
      "wishlist_product_added",
      "$pageview",
      "product_viewed",
    ]);
    expect(mocks.capture).toHaveBeenCalledWith(
      "wishlist_product_added",
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
    window.history.pushState(null, "", "/my-page/wishlist");
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
    const flush = await load();
    await flush();
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
