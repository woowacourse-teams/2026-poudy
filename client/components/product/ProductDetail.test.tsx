/**
 * @vitest-environment jsdom
 */
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ingredientSummary, ProductDetail } from "./ProductDetail";

import { track } from "@/lib/analytics/track";
import { productDetails, untaggedProductDetail } from "@/mocks/fixtures";

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

  it("상세 구역을 24px씩 띄우고 출처 안내에는 옅은 surface를 쓴다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const ingredientSummary = screen.getByRole("heading", { name: "성분 정보" }).closest("section");
    const detailSections = ingredientSummary?.parentElement;
    const source = screen.getByText("상품 정보 출처 안내").closest("section");

    expect(detailSections).toHaveClass("gap-6");
    expect(ingredientSummary).toHaveClass("before:bg-surface-subtle");
    expect(source).toHaveClass("before:bg-surface-subtle");
  });
});

const observers: IntersectionObserverCallback[] = [];

/** 축약형이 드러나는 때를 IntersectionObserver 가 알려 준다. 그 자리를 대신 두드린다. */
const scrollPastSummary = () => {
  act(() => {
    observers.forEach((notify) =>
      notify([{ boundingClientRect: { top: -1 } } as IntersectionObserverEntry], {} as IntersectionObserver),
    );
  });
};

const summaryBar = () => document.querySelector(".product-summary-bar") as HTMLElement;

/** 용량이 둘인 제품(1025 독도 토너). 가격을 접는 것을 확인하는 데 쓴다. */
const multiVariantProduct = productDetails[0];

describe("제품 상세 머리 고정", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          observers.push(callback);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("뒤로가기를 단 머리를 화면 위에 붙이고 바텀시트보다 아래에 둔다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const header = screen.getByRole("button", { name: "뒤로 가기" }).closest("header")?.parentElement;

    expect(header).toHaveClass("sticky", "top-0", "z-30", "bg-background");
  });

  it("원래 배치가 지나가기 전에는 축약형을 감추고 손도 받지 않는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
    expect(summaryBar()).toHaveAttribute("inert");
  });

  it("원래 배치가 머리 아래로 지나가면 축약형이 그 자리를 이어받는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollPastSummary();

    expect(summaryBar()).toHaveAttribute("data-stuck", "true");
    expect(summaryBar()).not.toHaveAttribute("inert");
  });

  it("축약형에도 브랜드·제품명·유수분·가격·저장 버튼이 모두 남는다", () => {
    render(<ProductDetail product={multiVariantProduct} />);
    scrollPastSummary();

    const bar = within(summaryBar());

    expect(bar.getByText(multiVariantProduct.brand.name)).toBeInTheDocument();
    expect(bar.getByText(multiVariantProduct.name)).toBeInTheDocument();
    expect(bar.getByText("수분")).toBeInTheDocument();
    expect(bar.getByText("유분")).toBeInTheDocument();
    expect(bar.getByRole("button", { name: `${multiVariantProduct.name} 저장` })).toBeInTheDocument();
    expect(summaryBar().querySelector("img")).toBeInTheDocument();
  });

  it("용량이 여럿이면 가장 싼 용량 하나로 접고 그보다 비싼 것이 있음을 알린다", () => {
    render(<ProductDetail product={multiVariantProduct} />);

    expect(within(summaryBar()).getByText("200ml 18,000원부터")).toBeInTheDocument();
  });

  it("용량이 하나면 그 값을 그대로 적는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(within(summaryBar()).getByText("50ml 39,000원")).toBeInTheDocument();
  });

  it("축약형의 제품명은 길어져도 한 줄로 줄인다", () => {
    render(<ProductDetail product={multiVariantProduct} />);

    expect(within(summaryBar()).getByText(multiVariantProduct.name).closest("p")).toHaveClass("truncate");
  });
});
