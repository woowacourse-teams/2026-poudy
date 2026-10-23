/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readProductEntry, rememberProductEntry } from "./product-entry";

describe("표준 제품 링크의 유입 경로", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/products/42");
    vi.useRealTimers();
  });

  it("주소에 추적 값을 붙이지 않아도 선택한 제품의 경로를 복원한다", () => {
    rememberProductEntry(42, "brand");
    expect(readProductEntry(42, "direct")).toBe("brand");
    expect(readProductEntry(43, "direct")).toBe("direct");
    expect(readProductEntry(42, "saved")).toBe("saved");
  });

  it("다른 화면·만료·잘못된 저장 값은 직접 진입으로 남긴다", () => {
    vi.useFakeTimers();
    rememberProductEntry(42, "home_ranking");
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(readProductEntry(42, "direct")).toBe("direct");
    window.sessionStorage.setItem("poudy:product-entry", "broken");
    expect(readProductEntry(42, "direct")).toBe("direct");
    rememberProductEntry(42, "brand");
    window.history.replaceState(null, "", "/saved");
    expect(readProductEntry(42, "direct")).toBe("direct");
  });
});
