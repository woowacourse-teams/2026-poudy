import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
}));

vi.mock("./client", () => client);

import {
  fetchBrand,
  fetchBrands,
  fetchCategories,
  fetchExcludeCodes,
  fetchIngredientsByIds,
  fetchProducts,
} from "./products";

import { EMPTY_FILTER } from "@/lib/domain/filter";

beforeEach(() => {
  client.apiGet.mockReset();
});

describe("fetchIngredientsByIds", () => {
  it("성분 ID 조회의 모든 페이지를 순서대로 합친다", async () => {
    const ingredientIds = Array.from({ length: 205 }, (_, index) => index + 1);

    client.apiGet.mockImplementation((_path: string, params: URLSearchParams) => {
      const requestedIds = params.getAll("ingredientIds").map(Number);
      const page = Number(params.get("page"));
      const size = Number(params.get("size"));
      const items = requestedIds.slice(page * size, (page + 1) * size).map((id) => ({
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
          hasNext: (page + 1) * size < requestedIds.length,
        },
      });
    });

    const response = await fetchIngredientsByIds(ingredientIds);

    expect(response.items.map(({ id }) => id)).toEqual(ingredientIds);
    expect(client.apiGet).toHaveBeenCalledTimes(3);
    expect(client.apiGet.mock.calls.map(([, params]) => params.get("page"))).toEqual(["0", "1", "2"]);
    expect(client.apiGet.mock.calls.every(([, params]) => params.get("size") === "100")).toBe(true);
    expect(client.apiGet.mock.calls.every(([, params]) => params.getAll("ingredientIds").length === 205)).toBe(true);
  });

  it("ID가 없으면 전체 성분을 조회하지 않는다", async () => {
    await expect(fetchIngredientsByIds([])).resolves.toEqual({ items: [] });
    expect(client.apiGet).not.toHaveBeenCalled();
  });
});

describe("목록 화면 fetch cache", () => {
  it("제품과 필터 재료를 12시간마다 재검증한다", () => {
    void fetchProducts(EMPTY_FILTER);
    void fetchExcludeCodes();
    void fetchCategories();
    void fetchBrands();
    void fetchBrand(1);

    expect(client.apiGet.mock.calls.map(([, , revalidate]) => revalidate)).toEqual([
      12 * 60 * 60,
      12 * 60 * 60,
      12 * 60 * 60,
      12 * 60 * 60,
      12 * 60 * 60,
    ]);
  });
});
