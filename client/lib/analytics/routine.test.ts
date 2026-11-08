/** @vitest-environment jsdom */
import type { RoutineResponse } from "@poudy/api/api.zod";
import { beforeEach, expect, it, vi } from "vitest";

import { routineChange, trackRoutineProducts } from "./routine";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("./track", () => ({ track }));
const product = (id: number) => ({ id, name: "제품", brandName: "브랜드", imageUrl: "" });
const routine = (morning: number[], evening: number[] = []): RoutineResponse => ({
  id: 12,
  name: "개인 이름",
  memo: "개인 메모",
  isPublic: false,
  morning: morning.map(product),
  evening: evening.map(product),
});

beforeEach(() => {
  track.mockClear();
  window.sessionStorage.clear();
});

it("첫 제품 추가와 재정렬·구간 이동을 구분하고 변경이 없으면 완료로 세지 않는다", () => {
  expect(routineChange(routine([]), routine([1]))).toBe("add");
  expect(routineChange(routine([1, 2]), routine([2, 1]))).toBe("reorder");
  expect(routineChange(routine([1]), routine([], [1]))).toBe("move");
  expect(routineChange(routine([1]), routine([2]))).toBe("replace");
  trackRoutineProducts(routine([1]), routine([1]));
  expect(track).not.toHaveBeenCalled();
});

it("완료에는 실제 제품 수를 넣고 루틴 이름과 메모는 보내지 않는다", () => {
  trackRoutineProducts(routine([]), routine([1]));
  expect(track).toHaveBeenCalledWith(
    "routine_products_updated",
    expect.objectContaining({ routine_id: 12, action: "add", previous_product_count: 0, product_count: 1 }),
  );
  expect(JSON.stringify(track.mock.calls)).not.toContain("개인");
});
