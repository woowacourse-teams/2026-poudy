/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductRows } from "./ProductRows";

import { track } from "@/lib/analytics/track";
import { EMPTY_FILTER } from "@/lib/domain/filter";
import type { useProductPages } from "@/lib/hooks/useProductPages";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const pages: ReturnType<typeof useProductPages> = {
  key: "personalized",
  first: 1,
  page: 1,
  items: [],
  total: 0,
  hasNext: false,
  loading: false,
  loaded: true,
  failed: false,
  signedOut: false,
  restored: false,
  revalidating: false,
  loadingPrevious: false,
  previousFailed: false,
  loadNext: vi.fn(),
  loadPrevious: vi.fn(),
  retry: vi.fn(),
};
const rows = (count?: number, result = pages) => (
  <ProductRows
    filter={{ ...EMPTY_FILTER, myFilter: true }}
    myFilterIngredientCount={count}
    basePath="/products"
    surface="product_list"
    pages={result}
    empty={<p>결과 없음</p>}
  />
);
beforeEach(() => vi.mocked(track).mockClear());

describe("개인화 결과 계측", () => {
  it("필터를 켜도 성분이 비어 있으면 개인화 사용으로 세지 않는다", () => {
    render(rows(0));
    expect(track).not.toHaveBeenCalledWith("personalized_results_viewed", expect.anything());
    expect(track).toHaveBeenCalledWith("product_list_viewed", expect.objectContaining({ my_filter_applied: false }));
  });
  it("성분 수가 확인된 뒤 실제 적용된 0건 결과도 한 번 기록한다", () => {
    const view = render(rows());
    expect(track).not.toHaveBeenCalledWith("personalized_results_viewed", expect.anything());
    view.rerender(rows(2));
    view.rerender(rows(2));
    const results = vi.mocked(track).mock.calls.filter(([event]) => event === "personalized_results_viewed");
    expect(results).toEqual([
      ["personalized_results_viewed", expect.objectContaining({ result_count: 0, my_filter_ingredient_count: 2 })],
    ]);
  });
  it("실패한 요청은 개인화 결과 조회로 남기지 않는다", () => {
    render(rows(2, { ...pages, loaded: false, failed: true }));
    expect(track).not.toHaveBeenCalledWith("personalized_results_viewed", expect.anything());
  });
});
