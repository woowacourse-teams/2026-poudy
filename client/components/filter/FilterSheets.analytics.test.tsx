/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { FilterSheets } from "./FilterSheets";

import { EMPTY_FILTER } from "@/lib/domain/filter";

const { track, countState } = vi.hoisted(() => ({
  track: vi.fn(),
  countState: { count: undefined as number | undefined, counting: false },
}));
vi.mock("@/lib/analytics/track", () => ({ track }));
vi.mock("@/lib/hooks/useProductCount", () => ({ useCountState: () => countState }));
const props = {
  filter: EMPTY_FILTER,
  onApply: vi.fn(),
  onClose: vi.fn(),
  categories: [],
  brands: [],
  skinChoices: [],
  skinNames: new Map(),
  markGroups: [],
  excludeCodes: [],
} as const;

beforeEach(() => {
  track.mockClear();
  countState.count = undefined;
  countState.counting = false;
});

it("마크 미리보기의 성공한 0건은 한 번 기록하고 알 수 없는 결과는 기록하지 않는다", () => {
  const view = render(<FilterSheets {...props} openSheet="mark" />);
  expect(track).not.toHaveBeenCalledWith("filter_preview_result_viewed", expect.anything());
  countState.count = 0;
  view.rerender(<FilterSheets {...props} openSheet="mark" />);
  view.rerender(<FilterSheets {...props} openSheet="mark" />);
  expect(track.mock.calls.filter(([event]) => event === "filter_preview_result_viewed")).toEqual([
    ["filter_preview_result_viewed", expect.objectContaining({ result_count: 0 })],
  ]);
});

it("시트를 닫은 뒤 도착한 개수는 미리보기로 세지 않는다", () => {
  countState.counting = true;
  const view = render(<FilterSheets {...props} openSheet="mark" />);
  view.rerender(<FilterSheets {...props} openSheet={undefined} />);
  countState.count = 8;
  countState.counting = false;
  view.rerender(<FilterSheets {...props} openSheet={undefined} />);
  expect(track).not.toHaveBeenCalledWith("filter_preview_result_viewed", expect.anything());
});
