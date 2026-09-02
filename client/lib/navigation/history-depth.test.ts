/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "poudy:history-depth";

const setNavigationType = (type: string) => {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type } as unknown as PerformanceEntry]);
};

const setReferrer = (value: string) => {
  Object.defineProperty(document, "referrer", { configurable: true, value });
};

const load = async () => {
  vi.resetModules();
  return import("./history-depth");
};

beforeEach(() => {
  sessionStorage.clear();
  setReferrer("");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("방문 기록 세기", () => {
  it("센 값을 탭에 남겨 둔다", async () => {
    setNavigationType("navigate");
    const { markPush } = await load();

    markPush();

    expect(sessionStorage.getItem(KEY)).toBe("1");
  });

  it("새로고침한 문서는 남겨 둔 값을 되살린다", async () => {
    sessionStorage.setItem(KEY, "2");
    setNavigationType("reload");
    const { hasInSiteHistory, markPop } = await load();

    expect(hasInSiteHistory()).toBe(true);

    markPop();
    markPop();

    expect(hasInSiteHistory()).toBe(false);
  });

  it("밖에서 새로 들어온 문서는 남겨 둔 값을 쓰지 않고 지운다", async () => {
    sessionStorage.setItem(KEY, "3");
    setNavigationType("navigate");
    const { hasInSiteHistory } = await load();

    expect(hasInSiteHistory()).toBe(false);
    expect(sessionStorage.getItem(KEY)).toBe("0");
  });
});

describe("방문 기록 출처", () => {
  it("우리 화면에서 넘어온 문서면 사이트 안 기록으로 본다", async () => {
    setNavigationType("navigate");
    setReferrer(`${window.location.origin}/categories/11`);
    const { hasInSiteHistory } = await load();

    expect(hasInSiteHistory()).toBe(true);
  });

  it("새로고침이 남긴 자기 주소는 사이트 안 기록으로 보지 않는다", async () => {
    setNavigationType("reload");
    setReferrer(window.location.href);
    const { hasInSiteHistory } = await load();

    expect(hasInSiteHistory()).toBe(false);
  });
});
