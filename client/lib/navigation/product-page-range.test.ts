import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireProductPage } from "./product-page-range";

import { fetchProducts } from "@/lib/api/products";
import { EMPTY_FILTER } from "@/lib/domain/filter";

vi.mock("@/lib/api/products", () => ({ fetchProducts: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const pagesAre = (totalPages: number) =>
  vi.mocked(fetchProducts).mockResolvedValue({
    items: [],
    pagination: { page: 1, size: 20, totalElements: totalPages * 20, totalPages, hasNext: false },
    brands: [],
    categories: [],
    skinTypes: [],
  });

describe("requireProductPage", () => {
  beforeEach(() => {
    vi.mocked(fetchProducts).mockReset();
  });

  it("마지막 장까지는 통과시킨다", async () => {
    pagesAre(6);

    await expect(requireProductPage({ ...EMPTY_FILTER, page: 6 })).resolves.toBeUndefined();
  });

  it("마지막 장을 넘어서면 404 로 끝낸다", async () => {
    pagesAre(6);

    await expect(requireProductPage({ ...EMPTY_FILTER, page: 7 })).rejects.toThrow("NOT_FOUND");
  });

  it("제품이 하나도 없으면 두 번째 장부터 404 다", async () => {
    pagesAre(0);

    await expect(requireProductPage({ ...EMPTY_FILTER, page: 2 })).rejects.toThrow("NOT_FOUND");
  });

  it("목록을 받지 못하면 판단하지 않는다", async () => {
    vi.mocked(fetchProducts).mockRejectedValue(new Error("down"));

    await expect(requireProductPage({ ...EMPTY_FILTER, page: 7 })).resolves.toBeUndefined();
  });
});
