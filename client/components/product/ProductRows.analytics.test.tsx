/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductRows } from "./ProductRows";

import { readProductExploration } from "@/lib/analytics/product-entry";
import { track } from "@/lib/analytics/track";
import { EMPTY_FILTER } from "@/lib/domain/filter";
import type { useProductPages } from "@/lib/hooks/useProductPages";
import { products } from "@/mocks/fixtures";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onNavigate,
  }: {
    readonly href: string;
    readonly children: ReactNode;
    readonly onNavigate?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
      }}
    >
      {children}
    </a>
  ),
}));
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
beforeEach(() => {
  vi.mocked(track).mockClear();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/products");
});

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
  it.each([
    ["로딩 중", { loading: true }],
    ["실패 후", { failed: true }],
  ])("다음 페이지 %s에도 기존 제품의 상세 진입에 같은 탐색 문맥을 전달한다", (_, state) => {
    const product = products[0];
    const result = { ...pages, items: [product], total: 40, hasNext: true };
    const view = render(rows(2, result));
    const link = screen.getByRole("link", { name: new RegExp(product.name) });
    fireEvent.click(link);
    window.history.replaceState(null, "", `/products/${product.id}`);
    const exploration = readProductExploration(product.id);
    expect(exploration?.my_filter_applied).toBe(true);

    view.rerender(rows(2, { ...result, ...state }));
    fireEvent.click(link);

    expect(readProductExploration(product.id)).toEqual(exploration);
    expect(vi.mocked(track).mock.calls.filter(([event]) => event === "personalized_results_viewed")).toHaveLength(1);
  });
});
