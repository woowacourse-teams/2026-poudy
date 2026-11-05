/** @vitest-environment jsdom */
import type { ProductComparisonItemResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { ProductComparisonScreen } from "./ProductComparisonScreen";

import { addComparisonItem, getComparisonTraySnapshot, refreshComparisonTray } from "@/lib/storage/comparison-tray";
import { server } from "@/mocks/server";

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

/** 받은 요청의 쿼리를 모으고, 정해 둔 제품으로 답한다. */
const answer = (products: readonly Product[]) => {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("*/api/products/comparison", ({ request }) => {
      const { searchParams } = new URL(request.url);
      queries.push(searchParams);
      const ids = (searchParams.get("productIds") ?? "").split(",").map(Number);
      return HttpResponse.json({ items: ids.flatMap((id) => products.find((item) => item.id === id) ?? []) });
    }),
  );
  return queries;
};

const seed = (...ids: readonly number[]) => {
  for (const id of ids) {
    addComparisonItem({ productId: id, name: `제품 ${id}`, brandName: `브랜드 ${id}`, imageUrl: "" });
  }
};

const view = () =>
  render(
    <ToastProvider>
      <ProductComparisonScreen />
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

describe("제품 비교", () => {
  it("담은 순서대로 받아 가격 · 유수분 · 쓰임새 · 주의 성분을 칸마다 보인다", async () => {
    seed(2, 1);
    const queries = answer([
      product(1),
      product(2, {
        selectedPart: part({
          moistureLevel: 0,
          oilLevel: 0,
          cautionGroups: [{ code: "FRAGRANCE", name: "향료", contains: true, ingredients: [] }],
        }),
      }),
    ]);
    view();

    expect(await screen.findByRole("button", { name: "제품 2 빼기" })).toBeInTheDocument();
    expect(queries[0].get("productIds")).toBe("2,1");

    expect(row("가격 · 용량 (대표 용량)").getAllByText("18,000원")).toHaveLength(2);
    expect(row("유수분").getByText("수분감 높음")).toBeInTheDocument();
    // 0단계는 값이 없는 것과 다르다.
    expect(row("유수분").getByText("수분감 없음")).toBeInTheDocument();
    expect(row("쓰임새").getAllByText("수분")).toHaveLength(2);
    expect(row("주의 성분").getByText("향료")).toBeInTheDocument();
    expect(row("주의 성분").getByText("없음")).toBeInTheDocument();
  });

  it("두 개만 담으면 빈 칸에 제품 담기를 두어 제품 검색으로 보낸다", async () => {
    seed(1, 2);
    answer([product(1), product(2)]);
    view();

    expect(await screen.findByRole("link", { name: "제품 담기" })).toHaveAttribute("href", "/search/products");
  });

  it("유수분은 모두 값이 없으면 줄째 숨기고, 일부만 없으면 줄표로 비운다", async () => {
    seed(1, 2);
    answer([
      product(1, { selectedPart: part({ moistureLevel: null, oilLevel: null }) }),
      product(2, { selectedPart: part({ moistureLevel: null, oilLevel: null }) }),
    ]);
    const { unmount } = view();
    await screen.findByRole("button", { name: "제품 1 빼기" });
    expect(screen.queryByRole("heading", { name: "유수분" })).not.toBeInTheDocument();
    unmount();

    answer([product(1, { selectedPart: part({ moistureLevel: null, oilLevel: null }) }), product(2)]);
    view();
    await screen.findByRole("button", { name: "제품 1 빼기" });
    expect(row("유수분").getByText("정보 없음")).toBeInTheDocument();
  });

  it("구성품이 없는 제품은 구성품 값을 줄표로 비운다", async () => {
    seed(1, 2);
    answer([product(1), product(2, { productParts: [], selectedPart: null })]);
    view();

    await screen.findByRole("button", { name: "제품 1 빼기" });
    expect(row("쓰임새").getByText("정보 없음")).toBeInTheDocument();
    expect(row("주의 성분").getByText("정보 없음")).toBeInTheDocument();
  });

  it("나만의 필터는 로그인 전과 저장한 성분이 없을 때 줄째 숨긴다", async () => {
    seed(1, 2);
    answer([product(1), product(2, { selectedPart: part({ myFilterStatus: "NO_FILTER" }) })]);
    view();

    await screen.findByRole("button", { name: "제품 1 빼기" });
    expect(screen.queryByRole("heading", { name: "나만의 필터" })).not.toBeInTheDocument();
  });

  it("나만의 필터에 걸린 성분을 이름으로, 걸리지 않은 제품은 없음으로 보인다", async () => {
    seed(1, 2);
    answer([
      product(1, { selectedPart: part({ myFilterStatus: "NO_MATCH" }) }),
      product(2, {
        selectedPart: part({
          myFilterStatus: "MATCH",
          myFilterIngredients: [{ id: 7, koreanName: "리모넨" }],
        }),
      }),
    ]);
    view();

    await screen.findByRole("heading", { name: "나만의 필터" });
    expect(row("나만의 필터").getByText("리모넨")).toBeInTheDocument();
    expect(row("나만의 필터").getByText("없음")).toBeInTheDocument();
  });

  it("제품 속성은 하나라도 값이 있을 때만 보이고 다이소는 넣지 않는다", async () => {
    seed(1, 2);
    answer([product(1, { marks: [{ code: "DAISO", name: "다이소" }] }), product(2)]);
    const { unmount } = view();
    await screen.findByRole("button", { name: "제품 1 빼기" });
    expect(screen.queryByRole("heading", { name: "제품 속성" })).not.toBeInTheDocument();
    unmount();

    answer([
      product(1, {
        marks: [
          { code: "MINERAL", name: "무기자차" },
          { code: "DAISO", name: "다이소" },
        ],
      }),
      product(2),
    ]);
    view();
    await screen.findByRole("heading", { name: "제품 속성" });
    expect(row("제품 속성").getByText("무기자차")).toBeInTheDocument();
    expect(row("제품 속성").queryByText("다이소")).not.toBeInTheDocument();
    expect(row("제품 속성").getByText("정보 없음")).toBeInTheDocument();
  });

  it("구성품이 여럿이면 칸 안에서 골라 그 구성품으로 다시 받는다", async () => {
    seed(1, 2);
    const parts = [
      { id: 11, name: "1제 세럼" },
      { id: 12, name: "2제 크림" },
    ];
    const queries = answer([product(1, { productParts: parts }), product(2)]);
    view();

    // 줄어든 머리의 버튼도 같은 이름이다. 화면에 놓인 순서상 제 자리 머리의 칸이 뒤에 온다.
    const selects = await screen.findAllByRole("button", { name: /제품 1 구성.*1제 세럼/ });
    await userEvent.click(selects.at(-1) as HTMLElement);
    await userEvent.click(await screen.findByRole("radio", { name: "2제 크림" }));

    await waitFor(() => expect(queries.at(-1)?.get("partIds[1]")).toBe("12"));
    expect(getComparisonTraySnapshot().items[0].partId).toBe(12);
  });

  it("×로 뺀 칸은 바로 사라지고, 하나만 남으면 그 제품의 상세로 옮긴다", async () => {
    seed(1, 2, 3);
    answer([product(1), product(2), product(3)]);
    view();

    await userEvent.click(await screen.findByRole("button", { name: "제품 3 빼기" }));
    expect(screen.queryByRole("button", { name: "제품 3 빼기" })).not.toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "제품 2 빼기" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/products/1"));
  });

  it("비어 있으면 제품을 찾으러 가는 안내를 보이고 서버에 묻지 않는다", async () => {
    const queries = answer([]);
    view();

    expect(await screen.findByText("비교함이 비어 있어요")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "제품 찾아보기" }));
    expect(navigation.push).toHaveBeenCalledWith("/search/products");
    expect(queries).toHaveLength(0);
  });

  it("고른 구성품이 없어졌으면 첫 구성품으로 되돌려 다시 받는다", async () => {
    addComparisonItem({ productId: 1, name: "제품 1", brandName: "브랜드 1", imageUrl: "", partId: 99 });
    seed(2);
    server.use(
      http.get("*/api/products/comparison", ({ request }) => {
        if (new URL(request.url).searchParams.has("partIds[1]")) {
          return HttpResponse.json(
            { title: "Not Found", status: 404, detail: "없음", code: "PRODUCT_PART_NOT_FOUND" },
            { status: 404 },
          );
        }
        return HttpResponse.json({ items: [product(1), product(2)] });
      }),
    );
    view();

    expect(await screen.findByRole("button", { name: "제품 1 빼기" })).toBeInTheDocument();
    expect(getComparisonTraySnapshot().items[0].partId).toBeUndefined();
  });

  it("없어진 제품이 있으면 비교함을 비울 수 있게 한다", async () => {
    seed(1, 2);
    server.use(
      http.get("*/api/products/comparison", () =>
        HttpResponse.json(
          { title: "Not Found", status: 404, detail: "없음", code: "PRODUCT_NOT_FOUND" },
          { status: 404 },
        ),
      ),
    );
    view();

    await userEvent.click(await screen.findByRole("button", { name: "비교함 비우기" }));
    expect(await screen.findByText("비교함이 비어 있어요")).toBeInTheDocument();
  });

  it("받지 못하면 다시 시도할 수 있다", async () => {
    seed(1, 2);
    let attempts = 0;
    server.use(
      http.get("*/api/products/comparison", () => {
        attempts += 1;
        if (attempts === 1) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ items: [product(1), product(2)] });
      }),
    );
    view();

    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("button", { name: "제품 1 빼기" })).toBeInTheDocument();
  });
});
