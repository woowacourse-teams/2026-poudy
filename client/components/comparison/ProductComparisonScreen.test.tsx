/** @vitest-environment jsdom */
import type { ProductComparisonItemResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { ProductComparisonScreen } from "./ProductComparisonScreen";

import { addComparisonItem, getComparisonTraySnapshot, refreshComparisonTray } from "@/lib/storage/comparison-tray";

type Product = ProductComparisonItemResponse;
type Part = NonNullable<Product["selectedPart"]>;

const part = (overrides: Partial<Part> = {}): Part => ({
  id: 11,
  name: null,
  skinEffects: [{ code: "HYDRATION_RELATED", name: "피부 수분 관련" }],
  moistureLevel: 3,
  oilLevel: 1,
  cautionGroups: [{ code: "SULFATES", name: "설페이트", contains: false, ingredients: [] }],
  myFilterStatus: "GUEST",
  myFilterIngredients: [],
  ...overrides,
});

const product = (id: number, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `제품 ${id}`,
  brand: { id: 1, name: `브랜드 ${id}`, englishName: null, imageUrl: "" } as Product["brand"],
  categories: [],
  marks: [],
  imageUrl: "",
  variants: [{ id, price: 18000, volumeValue: 200, volumeUnit: "ml", status: "active" }],
  productParts: [{ id: 11, name: null }],
  selectedPart: part(),
  updatedAt: "2026-11-05T15:00:00+09:00",
  ...overrides,
});

const seed = (...ids: readonly number[]) => {
  for (const id of ids) {
    addComparisonItem({ productId: id, name: `제품 ${id}`, brandName: `브랜드 ${id}`, imageUrl: "" });
  }
};

const view = (products: readonly Product[], missingProduct = false) =>
  render(
    <ToastProvider>
      <ProductComparisonScreen products={products} missingProduct={missingProduct} />
    </ToastProvider>,
  );

const row = (title: string) => {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`${title} 줄이 없다.`);
  return within(section);
};

beforeEach(() => {
  window.localStorage.clear();
  refreshComparisonTray();
  Object.values(navigation).forEach((mock) => mock.mockClear());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("제품 비교", () => {
  it("서버가 준 순서대로 가격 · 유수분 · 쓰임새 · 주의 성분을 칸마다 보인다", () => {
    view([
      product(2, {
        selectedPart: part({
          moistureLevel: 0,
          oilLevel: 0,
          cautionGroups: [{ code: "FRAGRANCE", name: "향료", contains: true, ingredients: [] }],
        }),
      }),
      product(1),
    ]);

    const removes = screen.getAllByRole("button", { name: /빼기$/ }).map((button) => button.getAttribute("aria-label"));
    expect(removes).toEqual(["제품 2 빼기", "제품 1 빼기"]);
    expect(row("가격 · 용량 (대표 용량)").getAllByText("18,000원")).toHaveLength(2);
    expect(row("유수분").getByText("수분감 높음")).toBeInTheDocument();
    // 0단계는 값이 없는 것과 다르다.
    expect(row("유수분").getByText("수분감 없음")).toBeInTheDocument();
    expect(row("쓰임새").getAllByText("수분")).toHaveLength(2);
    expect(row("주의 성분").getByText("향료")).toBeInTheDocument();
    expect(row("주의 성분").getByText("없음")).toBeInTheDocument();
  });

  it("상단 제목은 제품과 상관없이 같다", () => {
    const { unmount } = view([product(1), product(2), product(3)]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("제품 비교하기");
    unmount();

    view([]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("제품 비교하기");
  });

  it("머리가 화면에 보이는 동안에는 줄어든 머리를 띄우지 않고, 다 지나가면 띄운다", () => {
    const observers = new Map<Element, IntersectionObserverCallback>();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          observers.set(target, this.callback);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    const { container } = view([product(1), product(2)]);
    const compact = () => container.querySelector(".top-11 > div");
    const head = container.querySelector("main > div.border-b") as Element;
    const notify = (isIntersecting: boolean) =>
      act(() => observers.get(head)?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));

    expect(compact()).toHaveAttribute("inert");
    notify(false);
    expect(compact()).not.toHaveAttribute("inert");
    notify(true);
    expect(compact()).toHaveAttribute("inert");
  });

  it("두 개만 비교하면 빈 칸에 제품 담기를 두어 제품 검색으로 보낸다", () => {
    view([product(1), product(2)]);

    expect(screen.getByRole("link", { name: "제품 담기" })).toHaveAttribute("href", "/search/products");
  });

  it("유수분은 모두 값이 없으면 줄째 숨기고, 일부만 없으면 줄표로 비운다", () => {
    const noLevels = { selectedPart: part({ moistureLevel: null, oilLevel: null }) };
    const { unmount } = view([product(1, noLevels), product(2, noLevels)]);
    expect(screen.queryByRole("heading", { name: "유수분" })).not.toBeInTheDocument();
    unmount();

    view([product(1, noLevels), product(2)]);
    expect(row("유수분").getByText("정보 없음")).toBeInTheDocument();
  });

  it("구성품이 없는 제품은 구성품 값을 줄표로 비운다", () => {
    view([product(1), product(2, { productParts: [], selectedPart: null })]);

    expect(row("쓰임새").getByText("정보 없음")).toBeInTheDocument();
    expect(row("주의 성분").getByText("정보 없음")).toBeInTheDocument();
  });

  it("나만의 필터는 로그인 전과 저장한 성분이 없을 때 줄째 숨긴다", () => {
    view([product(1), product(2, { selectedPart: part({ myFilterStatus: "NO_FILTER" }) })]);

    expect(screen.queryByRole("heading", { name: "나만의 필터" })).not.toBeInTheDocument();
  });

  it("나만의 필터에 걸린 성분을 이름으로, 걸리지 않은 제품은 없음으로 보인다", () => {
    view([
      product(1, { selectedPart: part({ myFilterStatus: "NO_MATCH" }) }),
      product(2, {
        selectedPart: part({ myFilterStatus: "MATCH", myFilterIngredients: [{ id: 7, koreanName: "리모넨" }] }),
      }),
    ]);

    expect(row("나만의 필터").getByText("리모넨")).toBeInTheDocument();
    expect(row("나만의 필터").getByText("없음")).toBeInTheDocument();
  });

  it("제품 속성은 하나라도 값이 있을 때만 보이고 다이소는 넣지 않는다", () => {
    const { unmount } = view([product(1, { marks: [{ code: "DAISO", name: "다이소" }] }), product(2)]);
    expect(screen.queryByRole("heading", { name: "제품 속성" })).not.toBeInTheDocument();
    unmount();

    view([
      product(1, {
        marks: [
          { code: "MINERAL", name: "무기자차" },
          { code: "DAISO", name: "다이소" },
        ],
      }),
      product(2),
    ]);
    expect(row("제품 속성").getByText("무기자차")).toBeInTheDocument();
    expect(row("제품 속성").queryByText("다이소")).not.toBeInTheDocument();
    expect(row("제품 속성").getByText("정보 없음")).toBeInTheDocument();
  });

  it("구성품을 고르면 주소를 바꾸어 서버에서 다시 받고, 비교함도 함께 맞춘다", async () => {
    seed(1, 2);
    const parts = [
      { id: 11, name: "1제 세럼" },
      { id: 12, name: "2제 크림" },
    ];
    view([product(1, { productParts: parts }), product(2)]);

    // 줄어든 머리의 버튼도 같은 이름이다. 화면에 놓인 순서상 제 자리 머리의 칸이 뒤에 온다.
    const selects = screen.getAllByRole("button", { name: /제품 1 구성.*1제 세럼/ });
    await userEvent.click(selects.at(-1) as HTMLElement);
    await userEvent.click(await screen.findByRole("radio", { name: "2제 크림" }));

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/compare/result?productIds=1,2&partIds%5B1%5D=12", {
        scroll: false,
      }),
    );
    expect(getComparisonTraySnapshot().items[0].partId).toBe(12);
  });

  it("×로 빼면 주소와 비교함에서 함께 빠지고, 고른 구성품은 주소에 남는다", async () => {
    seed(1, 2, 3);
    const parts = [
      { id: 11, name: "1제" },
      { id: 12, name: "2제" },
    ];
    view([product(1, { productParts: parts }), product(2), product(3)]);

    await userEvent.click(screen.getByRole("button", { name: "제품 3 빼기" }));

    expect(navigation.replace).toHaveBeenCalledWith("/compare/result?productIds=1,2&partIds%5B1%5D=11", {
      scroll: false,
    });
    expect(getComparisonTraySnapshot().items.map(({ productId }) => productId)).toEqual([1, 2]);
  });

  it("하나만 남으면 그 제품의 상세로 옮긴다", async () => {
    seed(1, 2);
    view([product(1), product(2)]);

    await userEvent.click(screen.getByRole("button", { name: "제품 2 빼기" }));

    expect(navigation.replace).toHaveBeenCalledWith("/products/1", { scroll: false });
  });

  it("주소에 제품이 없고 비교함도 비었으면 제품을 찾으러 가는 안내를 보인다", async () => {
    view([]);

    expect(screen.getByText("비교함이 비어 있어요")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "제품 둘러보기" }));
    expect(navigation.push).toHaveBeenCalledWith("/search/products");
  });

  it("주소에 제품이 없어도 비교함에 담은 것이 있으면 그 제품으로 연다", async () => {
    seed(1, 2);
    view([]);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/compare/result?productIds=1,2"));
  });

  it("없어진 제품이 있으면 비교함을 비우고 빈 주소로 돌아간다", async () => {
    seed(1, 2);
    view([], true);

    await userEvent.click(screen.getByRole("button", { name: "비교함 비우기" }));

    expect(getComparisonTraySnapshot().items).toEqual([]);
    expect(navigation.replace).toHaveBeenCalledWith("/compare/result");
  });
});
