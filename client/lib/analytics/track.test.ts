/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * track 은 모듈을 읽는 시점에 환경 변수를 읽어 보낼지 정한다.
 * 환경을 바꿔 가며 확인해야 하므로 테스트마다 모듈을 새로 가져온다.
 */
const load = async (environment: string, key?: string) => {
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment);
  if (key === undefined) vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  else vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);

  vi.resetModules();
  return import("./track");
};

const capture = vi.fn();

beforeEach(() => {
  capture.mockClear();
  window.posthog = { capture, init: vi.fn() };
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.posthog;
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
});
