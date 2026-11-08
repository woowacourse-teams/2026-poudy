/** @vitest-environment jsdom */
import { beforeEach, expect, it, vi } from "vitest";

import { readFeatureFlow } from "./feature-flow";
import { selectSimilarSource } from "./similar-products";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("./track", () => ({ track }));
beforeEach(() => {
  track.mockClear();
  window.sessionStorage.clear();
});

it.each(["search", "shelf", "popular_dupe"] as const)(
  "%s 선택의 기준 제품과 실제 구성품을 결과까지 이어 준다",
  (source) => {
    selectSimilarSource(12, source, 123);
    const flow = readFeatureFlow("similar_products", 12);
    expect(flow).toMatchObject({ feature_source: "similar_products", entry_source: source });
    expect(track).toHaveBeenCalledWith("similar_source_selected", { ...flow, base_product_id: 12, base_part_id: 123 });
    expect(readFeatureFlow("similar_products", 13)).toBeUndefined();
  },
);
