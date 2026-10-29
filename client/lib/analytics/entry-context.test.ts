/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0.1 Mobile/15E148 Safari/604.1";

const load = async () => {
  vi.resetModules();
  return import("./entry-context");
};

const stubNavigation = (type: string) => {
  vi.spyOn(window.performance, "getEntriesByType").mockReturnValue([
    { type } as unknown as PerformanceNavigationTiming,
  ]);
};

beforeEach(() => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(IPHONE_SAFARI);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("inAppBrowserOf", () => {
  it.each([
    [`${IPHONE_SAFARI} KAKAOTALK 11.0.0`, "kakaotalk"],
    [`${IPHONE_SAFARI} Instagram 395.0.0.0`, "instagram"],
    [`${IPHONE_SAFARI} [FBAN/FBIOS;FBAV/530.0.0.0]`, "facebook"],
    [`${IPHONE_SAFARI} NAVER(inapp; search; 2000; 12.15.1)`, "naver"],
    [`${IPHONE_SAFARI} Line/15.10.1`, "line"],
    [`${IPHONE_SAFARI} DaumApps/8.8.0`, "daum"],
    [`${IPHONE_SAFARI} BAND/16.2.0`, "band"],
    [IPHONE_SAFARI, "none"],
  ] as const)("%s → %s", async (userAgent, expected) => {
    const { inAppBrowserOf } = await load();
    expect(inAppBrowserOf(userAgent)).toBe(expected);
  });
});

describe("entryContext", () => {
  it("문서가 열린 방식과 환경을 읽는다", async () => {
    stubNavigation("reload");
    const { entryContext } = await load();

    expect(entryContext()).toEqual({
      entry_navigation_type: "reload",
      entry_history_length: window.history.length,
      in_app_browser: "none",
      display_standalone: false,
      webdriver: false,
    });
  });

  it("처음 읽은 값을 유지해 SPA 이동으로 늘어난 기록 수를 쓰지 않는다", async () => {
    stubNavigation("navigate");
    const { entryContext } = await load();
    const first = entryContext().entry_history_length;

    window.history.pushState(null, "", "/brands");

    expect(entryContext().entry_history_length).toBe(first);
  });

  it("알 수 없는 열린 방식은 unknown 으로 남긴다", async () => {
    stubNavigation("something");
    const { entryContext } = await load();

    expect(entryContext().entry_navigation_type).toBe("unknown");
  });

  it("홈 화면 실행과 자동화 표시를 읽는다", async () => {
    stubNavigation("navigate");
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
    Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
    const { entryContext } = await load();

    expect(entryContext()).toMatchObject({ display_standalone: true, webdriver: true });

    Reflect.deleteProperty(navigator, "standalone");
    Reflect.deleteProperty(navigator, "webdriver");
  });
});
