import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("./client", () => client);

import {
  fetchBrand,
  fetchBrands,
  fetchCategories,
  fetchExcludeCodes,
  fetchIngredientsByIds,
  fetchProducts,
  recordProductView,
} from "./products";

import { EMPTY_FILTER } from "@/lib/domain/filter";

beforeEach(() => {
  client.apiGet.mockReset();
  client.apiPost.mockReset();
});

describe("제품 조회 기록", () => {
  it("본문 없이 제품 조회 기록 API를 호출한다", () => {
    void recordProductView(42);

    expect(client.apiPost).toHaveBeenCalledWith("/api/products/42/views");
  });
});

describe("fetchIngredientsByIds", () => {
  it("성분 ID 조회의 모든 페이지를 순서대로 합친다", async () => {
    const ingredientIds = Array.from({ length: 205 }, (_, index) => index + 1);

    client.apiGet.mockImplementation(
      (_path: string, _schema: unknown, { query: params }: { query: URLSearchParams }) => {
        const requestedIds = params.getAll("ingredientIds").map(Number);
        const page = Number(params.get("page"));
        const size = Number(params.get("size"));
        const items = requestedIds.slice((page - 1) * size, page * size).map((id) => ({
          id,
          koreanName: `성분 ${id}`,
          englishName: `Ingredient ${id}`,
          skinEffects: [],
        }));

        return Promise.resolve({
          items,
          pagination: {
            page,
            size,
            totalElements: requestedIds.length,
            totalPages: Math.ceil(requestedIds.length / size),
            hasNext: page * size < requestedIds.length,
          },
        });
      },
    );

    const response = await fetchIngredientsByIds(ingredientIds);

    expect(response.items.map(({ id }) => id)).toEqual(ingredientIds);
    expect(client.apiGet).toHaveBeenCalledTimes(3);
    expect(client.apiGet.mock.calls.map(([, , { query }]) => query.get("page"))).toEqual(["1", "2", "3"]);
    expect(client.apiGet.mock.calls.every(([, , { query }]) => query.get("size") === "100")).toBe(true);
    expect(client.apiGet.mock.calls.every(([, , { query }]) => query.getAll("ingredientIds").length === 205)).toBe(
      true,
    );
  });

  it("ID가 없으면 전체 성분을 조회하지 않는다", async () => {
    await expect(fetchIngredientsByIds([])).resolves.toEqual({ items: [] });
    expect(client.apiGet).not.toHaveBeenCalled();
  });
});

describe("목록 화면 fetch cache", () => {
  it("제품과 필터 재료를 12시간마다 재검증한다", () => {
    client.apiGet.mockResolvedValue({ items: [] });
    void fetchProducts(EMPTY_FILTER);
    void fetchExcludeCodes();
    void fetchCategories();
    void fetchBrands();
    void fetchBrand(1);

    expect(client.apiGet.mock.calls.map(([, , options]) => options?.revalidate)).toEqual([
      12 * 60 * 60,
      12 * 60 * 60,
      12 * 60 * 60,
      12 * 60 * 60,
      12 * 60 * 60,
    ]);
  });
});

describe("fetchCategories", () => {
  it("제품이 없는 소분류와 대분류를 뺀다", async () => {
    client.apiGet.mockResolvedValue({
      items: [
        {
          id: 1,
          name: "스킨케어",
          productCount: 3,
          children: [
            { id: 2, name: "토너", productCount: 3 },
            { id: 3, name: "미스트", productCount: 0 },
          ],
        },
        { id: 4, name: "선케어", productCount: 0, children: [{ id: 5, name: "선크림", productCount: 0 }] },
        { id: 6, name: "바디", productCount: 0, children: [] },
      ],
    });

    await expect(fetchCategories()).resolves.toEqual({
      items: [{ id: 1, name: "스킨케어", productCount: 3, children: [{ id: 2, name: "토너", productCount: 3 }] }],
    });
  });
});
