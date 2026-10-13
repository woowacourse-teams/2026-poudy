/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isStaleBuildError, reloadForStaleBuild } from "./stale-build";

const STALE = new Error(
  "Module 98810 was instantiated because it was required from module 28942, but the module factory is not available.",
);

const reload = vi.fn();

const stubLocation = (href: string) => {
  vi.stubGlobal("location", { href, reload });
};

beforeEach(() => {
  sessionStorage.clear();
  reload.mockClear();
  stubLocation("https://poudy.site/login");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("지난 빌드 오류 알아보기", () => {
  it("지난 빌드 모듈을 실행하다 난 오류를 알아본다", () => {
    expect(isStaleBuildError(STALE)).toBe(true);
  });

  it("chunk 를 받지 못한 오류를 알아본다", () => {
    expect(isStaleBuildError(new Error("Failed to load chunk /_next/static/chunks/1qq_0jo4xhu0n.js"))).toBe(true);
  });

  it("다른 오류는 그대로 둔다", () => {
    expect(isStaleBuildError(new Error("요청을 처리하지 못했습니다."))).toBe(false);
  });
});

describe("지난 빌드 오류에서 문서 새로 읽기", () => {
  it("지난 빌드 오류면 문서를 새로 읽는다", () => {
    reloadForStaleBuild(STALE, 1_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("다른 오류면 새로 읽지 않는다", () => {
    reloadForStaleBuild(new Error("요청을 처리하지 못했습니다."), 1_000);
    expect(reload).not.toHaveBeenCalled();
  });

  it("같은 주소를 새로 읽고도 곧바로 같은 오류가 나면 되풀이하지 않는다", () => {
    reloadForStaleBuild(STALE, 1_000);
    reload.mockClear();

    reloadForStaleBuild(STALE, 5_000);
    expect(reload).not.toHaveBeenCalled();
  });

  it("시간이 지났으면 같은 주소라도 다시 새로 읽는다", () => {
    reloadForStaleBuild(STALE, 1_000);
    reload.mockClear();

    reloadForStaleBuild(STALE, 12_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("다른 주소에서 난 오류는 바로 새로 읽는다", () => {
    reloadForStaleBuild(STALE, 1_000);
    reload.mockClear();
    stubLocation("https://poudy.site/wishlist");

    reloadForStaleBuild(STALE, 2_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("표시를 남길 수 없으면 되풀이를 막을 수 없어 새로 읽지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    reloadForStaleBuild(STALE, 1_000);
    expect(reload).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
