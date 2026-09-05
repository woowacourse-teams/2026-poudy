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

  it("문서의 대표 제목으로 바 문구가 아니라 제품명을 쓴다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("더마 릴리프 썬스크린");
    expect(screen.getByText("제품 상세").tagName).toBe("P");
  });

  it("피부 작용 태그가 없는 24개 전성분 제품을 깨진 조사 없이 보여 준다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("heading", { name: "더마 릴리프 썬스크린" })).toBeInTheDocument();
    expect(screen.getByText("24개 전성분으로 이루어진 제품이에요.")).toBeInTheDocument();
    expect(screen.queryByText(/기준으로,\s*을/)).not.toBeInTheDocument();
  });

  it("첫 화면의 대표 이미지만 즉시 불러온다", () => {
    const { container } = render(<ProductDetail product={untaggedProductDetail} />);
    const compactImage = summaryBar().querySelector("img");
    const mainImage = container.querySelector("main section img");

    expect(mainImage).toHaveAttribute("loading", "eager");
    expect(compactImage).toHaveAttribute("loading", "lazy");
  });

  it("전성분 펼쳐보기 버튼 배경을 Callout과 같은 surface 너비로 확장한다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const toggle = screen.getByRole("button", { name: "나머지 19개 성분 펼쳐보기" });

    expect(toggle).toHaveClass("bg-transparent", "before:-inset-x-4", "before:bg-[#F4F5F6]");
  });

  it("카테고리 경로의 대분류와 소분류를 각각의 목록으로 잇는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });

    expect(within(path).getByRole("link", { name: "선케어 카테고리 제품" })).toHaveAttribute("href", "/categories/2");
    expect(within(path).getByRole("link", { name: "선크림 카테고리 제품" })).toHaveAttribute("href", "/categories/21");
  });

  it("브랜드명을 브랜드관으로 잇는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("link", { name: "셀퓨전씨 브랜드관" })).toHaveAttribute("href", "/brands/6");
  });

  it("보이는 이름을 그대로 담은 이름으로 어디로 가는지 알린다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });

    expect(within(path).getByRole("link", { name: "선케어 카테고리 제품" })).toHaveTextContent("선케어");
    expect(screen.getByRole("link", { name: "셀퓨전씨 브랜드관" })).toHaveTextContent("셀퓨전씨");
  });

  it("이동할 수 있는 카테고리와 브랜드는 누르는 동안 옅어진다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });

    expect(within(path).getByRole("link", { name: "선케어 카테고리 제품" })).toHaveClass("active:opacity-60");
    expect(within(path).getByRole("link", { name: "선크림 카테고리 제품" })).toHaveClass("active:opacity-60");
    expect(screen.getByRole("link", { name: "셀퓨전씨 브랜드관" })).toHaveClass("active:opacity-60");
  });

  it("이동할 수 있는 카테고리와 브랜드의 누를 자리를 넓힌다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    const path = screen.getByRole("navigation", { name: "카테고리 경로" });
    const links = [
      within(path).getByRole("link", { name: "선케어 카테고리 제품" }),
      within(path).getByRole("link", { name: "선크림 카테고리 제품" }),
      screen.getByRole("link", { name: "셀퓨전씨 브랜드관" }),
    ];

    links.forEach((link) => expect(link).toHaveClass("py-1.5", "-my-1.5"));
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

/** 지켜보는 자리마다 하나씩. 각자 제 자리의 `rootMargin` 을 기억한다. */
const observers: { readonly margin: number; readonly notify: IntersectionObserverCallback }[] = [];

/**
 * 지켜보는 자리를 화면 위 `top` 에 두고 IntersectionObserver 가 알리는 것을 흉내 낸다.
 *
 * 진짜 관찰자는 제 자리를 넘는 순간에만 알려 온다. 넘지 않은 자리는 잠자코 있어야
 * 되돌아올 때 생기던 문제가 시험에도 그대로 나타난다.
 */
const scrollSummaryEndTo = (top: number, previousTop = Infinity) => {
  act(() => {
    observers
      .filter(({ margin }) => top < margin !== previousTop < margin)
      .forEach(({ notify }) =>
        notify([{ boundingClientRect: { top } } as IntersectionObserverEntry], {} as IntersectionObserver),
      );
  });
};

/** 축약형이 드러나는 때를 IntersectionObserver 가 알려 준다. 그 자리를 대신 두드린다. */
const scrollPastSummary = () => scrollSummaryEndTo(-1);

const summaryBar = () => document.querySelector(".product-summary-bar") as HTMLElement;

/** 용량이 둘인 제품(1025 독도 토너). 이름이 긴 제품을 확인하는 데 쓴다. */
const multiVariantProduct = productDetails[0];

describe("제품 상세 머리 고정", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          observers.push({ margin: -parseFloat(String(options?.rootMargin ?? "0")), notify: callback });
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

    const header = screen.getByText("제품 상세").closest("header")?.parentElement;

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

  it("나타난 뒤에는 나타난 자리로 조금 되돌아와도 그대로 남는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollPastSummary();
    // 나타나는 자리(44)는 다시 넘겼지만 사라지는 자리(44+24)에는 못 미친 그사이.
    scrollSummaryEndTo(50, -1);

    expect(summaryBar()).toHaveAttribute("data-stuck", "true");
  });

  it("사라지는 자리까지 거슬러 올라가야 축약형이 물러난다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollPastSummary();
    scrollSummaryEndTo(68, -1);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
  });

  it("그사이에 머물러 있으면 나타난 적 없는 축약형은 나오지 않는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollSummaryEndTo(50);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
  });

  it("한참 내려갔다 되돌아와도 사라지는 자리를 넘으면 축약형이 물러난다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    // 한참 내려가면 지켜보는 자리를 둘 다 지나 알림이 끊긴다.
    scrollSummaryEndTo(-800);
    scrollSummaryEndTo(300, -800);

    expect(summaryBar()).toHaveAttribute("data-stuck", "false");
  });

  it("되돌아오다 그사이에 멈추면 축약형이 그대로 남는다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    scrollSummaryEndTo(-800);
    // 나타나는 자리(44)는 넘었지만 사라지는 자리(68)에는 못 미친 그사이.
    scrollSummaryEndTo(50, -800);

    expect(summaryBar()).toHaveAttribute("data-stuck", "true");
  });

  it("축약형에도 브랜드·제품명·유수분·저장 버튼이 모두 남는다", () => {
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

  it("축약형의 제품명은 길어져도 한 줄로 줄인다", () => {
    render(<ProductDetail product={multiVariantProduct} />);

    expect(within(summaryBar()).getByText(multiVariantProduct.name).closest("p")).toHaveClass("truncate");
  });
});

describe("상품 정보 출처 안내", () => {
  it("정보 수정 제안으로 제품 정보 정정 화면에 간다", () => {
    render(<ProductDetail product={untaggedProductDetail} />);

    expect(screen.getByRole("link", { name: /정보 수정 제안/ })).toHaveAttribute(
      "href",
      `/inquiry/products/${untaggedProductDetail.id}`,
    );
  });
});
