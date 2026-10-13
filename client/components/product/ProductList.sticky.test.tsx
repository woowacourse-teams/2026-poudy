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

  /* 결과가 적어도 칩 줄이 붙는 자리까지 내려가야 조건을 바꿀 때 칩 줄이 튀지 않는다. */
  it("칩 줄부터 목록 끝까지를 칩 줄이 붙는 자리부터 화면 끝까지의 높이 이상으로 둔다", () => {
    render(<ProductList excludeCodes={excludeCodes} stickyChips="brand" />);

    const runway = screen.getByRole("button", { name: "성분" }).closest(".brand-filter-chip-bar")?.parentElement;
    expect(runway?.style.minHeight).toBe("calc(100lvh - 100px)");
    expect(runway?.querySelector("main")).not.toBeNull();
  });

  it("칩 줄이 붙지 않는 화면은 높이를 늘리지 않는다", () => {
    const { container } = render(<ProductList excludeCodes={excludeCodes} />);

    expect(container.querySelector<HTMLElement>("[style*='min-height']")).toBeNull();
  });
});
