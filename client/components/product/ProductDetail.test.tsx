/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ingredientSummary, ProductDetail } from "./ProductDetail";

import { track } from "@/lib/analytics/track";
import { untaggedProductDetail } from "@/mocks/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

describe("제품 성분 요약", () => {
  it("제품 조회에 상세 진입 경로를 남긴다", async () => {
    render(<ProductDetail product={untaggedProductDetail} entryPoint="saved" />);

    await vi.waitFor(() =>
      expect(track).toHaveBeenCalledWith("product_viewed", {
        product_id: untaggedProductDetail.id,
        category: untaggedProductDetail.categories[0]?.name,
        entry_point: "saved",
      }),
    );
  });

  it("피부 작용 태그가 없으면 전성분 수만 안내한다", () => {
    expect(ingredientSummary(24, [])).toBe("24개 전성분으로 이루어진 제품이에요.");
  });

  it("피부 작용 태그가 하나면 함께라는 표현을 쓰지 않는다", () => {
    expect(ingredientSummary(24, ["수분"])).toBe("24개 전성분을 기준으로, 수분 성분을 담은 구성입니다.");
  });

  it("피부 작용 태그가 둘 이상이면 앞의 두 종류를 함께 안내한다", () => {
    expect(ingredientSummary(24, ["수분", "진정", "미백"])).toBe(
      "24개 전성분을 기준으로, 수분 성분과 진정 성분을 함께 담은 구성입니다.",
    );
  });

  it("피부 작용 태그가 없는 24개 전성분 제품을 깨진 조사 없이 보여 준다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { name: "더마 릴리프 썬스크린" })).toBeInTheDocument();
    expect(screen.getByText("24개 전성분으로 이루어진 제품이에요.")).toBeInTheDocument();
    expect(screen.queryByText(/기준으로,\s*을/)).not.toBeInTheDocument();
  });

  it("전성분 펼쳐보기 버튼 배경을 Callout과 같은 surface 너비로 확장한다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const toggle = screen.getByRole("button", { name: "나머지 19개 성분 펼쳐보기" });

    expect(toggle).toHaveClass("bg-transparent", "before:-inset-x-4", "before:bg-[#F4F5F6]");
  });
});
