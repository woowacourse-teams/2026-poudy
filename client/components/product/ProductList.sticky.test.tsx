/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

import { excludeCodes } from "@/mocks/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./ProductRows", () => ({ ProductRows: () => <main /> }));

describe("제품 필터 칩 고정 머리", () => {
  it("카테고리에서는 필터 칩을 형제 카테고리 줄 아래에 붙인다", () => {
    render(
      <ProductList
        excludeCodes={excludeCodes}
        fixedFilter={{ categoryIds: [1] }}
        hiddenChips={["category"]}
        stickyChips="category"
      />,
    );

    expect(screen.getByRole("button", { name: "성분" }).closest(".category-filter-chip-bar")).not.toBeNull();
    expect(document.querySelector(".filter-summary-bar")).toBeNull();
  });

  it("조건 일치 제품에서는 기존 탐색 조건 머리를 유지한다", () => {
    render(<ProductList excludeCodes={excludeCodes} stickyChips="summary" />);

    expect(screen.getByRole("button", { name: "성분" }).closest(".filter-chip-bar")).not.toBeNull();
    expect(document.querySelector(".filter-summary-bar")).not.toBeNull();
  });
});
