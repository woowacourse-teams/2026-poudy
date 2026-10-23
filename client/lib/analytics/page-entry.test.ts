/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readPageEntry, rememberPageEntry, separateEntry } from "./page-entry";

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});
afterEach(() => vi.restoreAllMocks());

describe("URL 밖의 페이지 유입 추적", () => {
  it("추적값만 제거하고 페이지·필터·구성품·해시는 보존한다", () => {
    expect(separateEntry("/products/12?partId=7&from=shelf#ingredients")).toEqual({
      href: "/products/12?partId=7#ingredients",
      entryPoint: "shelf",
    });
    expect(separateEntry("/categories/2?page=3")).toEqual({ href: "/categories/2?page=3" });
  });
  it("일치하는 이동 대상에서만 읽고 30분 뒤에는 만료된다", () => {
    rememberPageEntry("/ingredients/9", "ingredient_sheet");
    expect(readPageEntry()).toBeUndefined();
    window.history.replaceState({}, "", "/ingredients/9");
    expect(readPageEntry()).toBe("ingredient_sheet");
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 31 * 60 * 1000);
    expect(readPageEntry()).toBeUndefined();
  });
  it("손상된 저장값과 차단된 저장소는 추적을 생략한다", () => {
    window.sessionStorage.setItem("poudy:page-entry", "invalid");
    expect(readPageEntry()).toBeUndefined();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberPageEntry("/ingredients/9", "shelf")).not.toThrow();
  });
});
