/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readProductEntry,
  readProductExploration,
  readProductFeature,
  rememberFeatureProductEntry,
  rememberProductEntry,
} from "./product-entry";

describe("표준 제품 링크의 유입 경로", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/products/42");
    vi.useRealTimers();
  });

  it("유사템 기준 구성품과 선택한 제품을 연결하고 다른 링크에서는 이전 문맥을 지운다", () => {
    const feature = {
      feature_flow_id: "flow-1",
      feature_source: "similar_products",
      entry_source: "shelf",
      base_product_id: 9,
      base_part_id: 10,
    } as const;
    rememberFeatureProductEntry(42, "similar_finder", feature);
    expect(readProductFeature(42)).toMatchObject(feature);
    expect(readProductFeature(43)).toBeUndefined();
    rememberProductEntry(42, "brand");
    expect(readProductFeature(42)).toBeUndefined();
  });

  it("잘못된 기능 문맥과 만료된 선택은 상세에 붙이지 않는다", () => {
    vi.useFakeTimers();
    rememberFeatureProductEntry(42, "youtube", {
      feature_flow_id: "flow-2",
      feature_source: "youtube",
      entry_source: "home",
      channel_id: "channel-1",
    });
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(readProductFeature(42)).toBeUndefined();
    window.sessionStorage.setItem(
      "poudy:product-entry:42",
      JSON.stringify({ productId: 42, at: Date.now(), feature: { feature_source: "youtube", feature_flow_id: 123 } }),
    );
    expect(readProductFeature(42)).toBeUndefined();
  });

  it("주소에 추적 값을 붙이지 않아도 선택한 제품의 경로를 복원한다", () => {
    rememberProductEntry(42, "brand");
    expect(readProductEntry(42, "direct")).toBe("brand");
    expect(readProductEntry(43, "direct")).toBe("direct");
    expect(readProductEntry(42, "saved")).toBe("saved");
  });

  it("다른 제품을 방문한 뒤 돌아와도 각 제품의 유입 경로를 유지한다", () => {
    rememberProductEntry(42, "home_ranking");
    rememberProductEntry(43, "similar_product");
    window.history.replaceState(null, "", "/products/43");
    expect(readProductEntry(43, "direct")).toBe("similar_product");
    window.history.replaceState(null, "", "/products/42");
    expect(readProductEntry(42, "direct")).toBe("home_ranking");
  });

  it("다른 화면·만료·잘못된 저장 값은 직접 진입으로 남긴다", () => {
    vi.useFakeTimers();
    rememberProductEntry(42, "home_ranking");
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(readProductEntry(42, "direct")).toBe("direct");
    window.sessionStorage.setItem("poudy:product-entry:42", "broken");
    expect(readProductEntry(42, "direct")).toBe("direct");
    rememberProductEntry(42, "brand");
    window.history.replaceState(null, "", "/saved");
    expect(readProductEntry(42, "direct")).toBe("direct");
  });

  it("개인화 목록에서 선택한 제품에만 탐색 문맥을 연결한다", () => {
    const exploration = { exploration_id: "results-1", my_filter_applied: true, my_filter_ingredient_count: 2 };
    rememberProductEntry(42, "product_list", exploration);
    expect(readProductExploration(42)).toEqual(exploration);
    expect(readProductExploration(43)).toBeUndefined();
    window.history.replaceState(null, "", "/products");
    expect(readProductExploration(42)).toBeUndefined();
  });

  it("새 링크나 만료된 문맥을 이전 개인화 결과에 연결하지 않는다", () => {
    vi.useFakeTimers();
    const exploration = { exploration_id: "results-1", my_filter_applied: true, my_filter_ingredient_count: 2 };
    rememberProductEntry(42, "product_list", exploration);
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(readProductExploration(42)).toBeUndefined();
    rememberProductEntry(42, "product_list", exploration);
    rememberProductEntry(42, "brand");
    expect(readProductExploration(42)).toBeUndefined();
  });
});
