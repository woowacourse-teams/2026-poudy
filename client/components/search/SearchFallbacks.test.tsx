/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExcludeCodeGuide } from "./ExcludeCodeGuide";
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
  it("성분군마다 드는 성분을 성분 페이지 링크로 둔다", () => {
    render(<ExcludeCodeGuide excludeCodes={excludeCodes} />);

    const first = excludeCodes[0];
    const group = screen.getByText(first.name.replace(/\s*제외$/, "")).closest("details");
    expect(group).not.toBeNull();
    expect(within(group!).getByText(`${first.ingredients.length}개`)).toBeInTheDocument();
    expect(within(group!).getByRole("link", { name: first.ingredients[0].koreanName, hidden: true })).toHaveAttribute(
      "href",
      `/ingredients/${first.ingredients[0].id}`,
    );
  });

  it("성분 검색은 조건 없는 화면과 함께 넘겨받은 것을 그린다", () => {
    render(
      <IngredientSearchScreenFallback excludeCodes={excludeCodes}>
        <p>성분군 안내</p>
      </IngredientSearchScreenFallback>,
    );

    expect(screen.getByRole("searchbox", { name: "성분 검색" })).toBeInTheDocument();
    expect(screen.getByText("선택한 성분 없음")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(excludeCodes.length);
    expect(screen.getByText("성분군 안내")).toBeInTheDocument();
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
