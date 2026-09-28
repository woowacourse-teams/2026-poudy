/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IngredientSearchScreenFallback } from "./IngredientSearchScreen";
import { ProductSearchPanelFallback } from "./ProductSearchPanel";

import { excludeCodes } from "@/mocks/fixtures";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

// 미리 만든 HTML 에 담기는 모양이라 주소를 읽지 않아야 한다. 읽으면 여기서 터진다.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => {
    throw new Error("주소를 읽었다");
  },
}));

describe("검색 화면의 미리 만든 모양", () => {
  it("성분 검색은 조건 없는 화면을 그린다", () => {
    render(<IngredientSearchScreenFallback excludeCodes={excludeCodes} />);

    expect(screen.getByRole("searchbox", { name: "성분 검색" })).toBeInTheDocument();
    expect(screen.getByText("선택한 성분 없음")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(excludeCodes.length);
  });

  it("제품 검색은 검색창과 함께 넘겨받은 것을 그린다", () => {
    render(
      <ProductSearchPanelFallback>
        <p>인기 검색어</p>
      </ProductSearchPanelFallback>,
    );

    expect(screen.getByRole("searchbox", { name: "제품명 검색" })).toBeInTheDocument();
    expect(screen.getByText("인기 검색어")).toBeInTheDocument();
  });
});
