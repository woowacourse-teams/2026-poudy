/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { newFeatureFlow, readFeatureFlow, rememberFeatureFlow } from "./feature-flow";

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.useRealTimers());

it("로그인 왕복 뒤 같은 기능과 대상의 흐름만 복원한다", () => {
  const flow = newFeatureFlow("routine", "feed");
  rememberFeatureFlow("routine", 12, flow);
  expect(readFeatureFlow("routine", 12)).toEqual(flow);
  expect(readFeatureFlow("routine", 13)).toBeUndefined();
  expect(readFeatureFlow("similar_products", 12)).toBeUndefined();
});

it("만료·미래 시각·잘못된 외부 저장 값은 연결하지 않는다", () => {
  vi.useFakeTimers();
  const flow = newFeatureFlow("routine", "feed");
  rememberFeatureFlow("routine", 12, flow);
  vi.advanceTimersByTime(61 * 60 * 1000);
  expect(readFeatureFlow("routine", 12)).toBeUndefined();
  window.sessionStorage.setItem("poudy.feature-flow.v1:routine:12", JSON.stringify({ at: Date.now() + 1000, flow }));
  expect(readFeatureFlow("routine", 12)).toBeUndefined();
  window.sessionStorage.setItem(
    "poudy.feature-flow.v1:routine:12",
    JSON.stringify({ at: Date.now(), flow: { ...flow, feature_source: "youtube" } }),
  );
  expect(readFeatureFlow("routine", 12)).toBeUndefined();
});

it("저장소 접근이 막혀도 사용자 동작을 중단하지 않는다", () => {
  const mock = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => rememberFeatureFlow("routine", 1, newFeatureFlow("routine", "feed"))).not.toThrow();
  mock.mockRestore();
});
