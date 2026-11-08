/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { readFilterFlow, rememberFilterFlow } from "./filter-flow";

import { EMPTY_FILTER } from "@/lib/domain/filter";

const flow = { filter_flow_id: "filter-1", mark_group: "feature", mark_codes: ["DAISO"] };
beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.useRealTimers());

it("같은 실제 조건의 페이지·정렬 변경에는 문맥을 유지하고 다른 조건에는 붙이지 않는다", () => {
  const filter = { ...EMPTY_FILTER, marks: ["DAISO"] };
  rememberFilterFlow(filter, flow);
  expect(readFilterFlow({ ...filter, page: 2, sort: "PRICE_ASC" })).toEqual(flow);
  expect(readFilterFlow({ ...filter, marks: [] })).toBeUndefined();
  expect(readFilterFlow({ ...filter, keyword: "다른 조건" })).toBeUndefined();
});

it("만료·잘못된 세션 값은 결과나 상세에 연결하지 않는다", () => {
  vi.useFakeTimers();
  rememberFilterFlow(EMPTY_FILTER, flow);
  vi.advanceTimersByTime(31 * 60 * 1000);
  expect(readFilterFlow(EMPTY_FILTER)).toBeUndefined();
  window.sessionStorage.setItem("poudy.filter-flow.v1", "broken");
  expect(readFilterFlow(EMPTY_FILTER)).toBeUndefined();
});
