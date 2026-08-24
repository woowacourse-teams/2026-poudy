import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchBrands: vi.fn(),
  fetchCategories: vi.fn(),
  fetchIngredients: vi.fn(),
  fetchProducts: vi.fn(),
}));

vi.mock("@/lib/api/products", () => api);

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("사이트 주소", () => {
  it("환경 변수가 없으면 개발 주소를 쓴다", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(siteUrl().toString()).toBe("http://localhost:3000/");
    expect(absoluteUrl("/products/1")).toBe("http://localhost:3000/products/1");
  });
});

describe("robots", () => {
  it("운영에서는 공개 화면만 크롤링을 허용한다", () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");

    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: ["/", "/products/"],
        disallow: ["/products", "/search", "/saved"],
      },
      sitemap: "https://poudy.site/sitemap.xml",
      host: "https://poudy.site",
    });
  });

  it("staging에서는 전체 크롤링을 막는다", () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");

    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("sitemap", () => {
  it("고정·카테고리·브랜드·제품·성분 상세 주소를 절대 주소로 만든다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [{ id: 11 }] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchProducts.mockResolvedValue({
      items: [{ id: 30 }],
      pagination: { hasNext: false },
    });
    api.fetchIngredients.mockImplementation(({ ingredientIds }: { readonly ingredientIds: readonly number[] }) => {
      if (ingredientIds[0] === 1) return Promise.resolve({ items: [{ id: 40 }] });
      return Promise.resolve({ items: ingredientIds[0] === 5001 ? [{ id: 5001 }] : [] });
    });

    const entries = await sitemap();

    expect(entries.map(({ url }) => url)).toEqual(
      expect.arrayContaining([
        "https://poudy.site/",
        "https://poudy.site/categories",
        "https://poudy.site/categories/10",
        "https://poudy.site/categories/11",
        "https://poudy.site/brands/20",
        "https://poudy.site/products/30",
        "https://poudy.site/ingredients/40",
        "https://poudy.site/ingredients/5001",
      ]),
    );
    expect(api.fetchIngredients).toHaveBeenCalledTimes(100);
    expect(api.fetchProducts).toHaveBeenCalledTimes(1);
  });

  it("뒤쪽 제품 페이지가 실패해도 앞에서 찾은 제품 주소는 유지한다", async () => {
    api.fetchCategories.mockRejectedValue(new Error("categories unavailable"));
    api.fetchBrands.mockRejectedValue(new Error("brands unavailable"));
    api.fetchIngredients.mockRejectedValue(new Error("ingredients unavailable"));
    api.fetchProducts.mockImplementation(({ page }: { readonly page: number }) => {
      if (page === 0) {
        return Promise.resolve({ items: [{ id: 30 }], pagination: { hasNext: true } });
      }
      return Promise.reject(new Error("second product page unavailable"));
    });

    const entries = await sitemap();

    expect(entries.map(({ url }) => url)).toContain("http://localhost:3000/products/30");
  });

  it("API가 모두 실패해도 고정 주소는 유지한다", async () => {
    api.fetchCategories.mockRejectedValue(new Error("categories unavailable"));
    api.fetchBrands.mockRejectedValue(new Error("brands unavailable"));
    api.fetchProducts.mockRejectedValue(new Error("products unavailable"));
    api.fetchIngredients.mockRejectedValue(new Error("ingredients unavailable"));

    await expect(sitemap()).resolves.toHaveLength(3);
  });

  it("일부 성분 배치가 실패해도 성공한 성분 주소는 유지한다", async () => {
    api.fetchCategories.mockRejectedValue(new Error("categories unavailable"));
    api.fetchBrands.mockRejectedValue(new Error("brands unavailable"));
    api.fetchProducts.mockRejectedValue(new Error("products unavailable"));
    api.fetchIngredients.mockImplementation(({ ingredientIds }: { readonly ingredientIds: readonly number[] }) => {
      if (ingredientIds[0] === 1) return Promise.reject(new Error("first batch unavailable"));
      return Promise.resolve({ items: ingredientIds[0] === 101 ? [{ id: 40 }] : [] });
    });

    const entries = await sitemap();

    expect(entries.map(({ url }) => url)).toContain("http://localhost:3000/ingredients/40");
  });
});
