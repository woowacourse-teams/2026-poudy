import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchBrands: vi.fn(),
  fetchCategories: vi.fn(),
  fetchIngredients: vi.fn(),
  fetchProducts: vi.fn(),
}));

vi.mock("@/lib/api/products", () => api);

import robots from "@/app/robots";
import { GET as sitemapIndex } from "@/app/sitemap.xml/route";
import { revalidate as ingredientSitemapRevalidate } from "@/app/sitemaps/ingredients.xml/route";
import { revalidate as pageSitemapRevalidate } from "@/app/sitemaps/pages.xml/route";
import { revalidate as productSitemapRevalidate } from "@/app/sitemaps/products.xml/route";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";
import { ingredientEntries, pageEntries, productEntries } from "@/lib/seo/sitemap";

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
        disallow: "/products",
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
  it("인덱스가 분리된 사이트맵을 절대 주소로 연결한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");

    const response = sitemapIndex();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://poudy.site/sitemaps/pages.xml</loc>");
    expect(xml).toContain("<loc>https://poudy.site/sitemaps/products.xml</loc>");
    expect(xml).toContain("<loc>https://poudy.site/sitemaps/ingredients.xml</loc>");
  });

  it("제품은 12시간, 나머지 주소와 성분은 24시간 간격으로 다시 조회한다", () => {
    expect(productSitemapRevalidate).toBe(43200);
    expect(pageSitemapRevalidate).toBe(86400);
    expect(ingredientSitemapRevalidate).toBe(86400);
  });

  it("고정·카테고리·브랜드·제품·성분 상세 주소를 절대 주소로 만든다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [{ id: 11 }] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchProducts.mockResolvedValue({
      items: [{ id: 30 }],
      pagination: { hasNext: false },
    });
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) =>
      Promise.resolve({
        items: page === 0 ? [{ id: 40 }] : [{ id: 5001 }],
        pagination: { hasNext: page === 0 },
      }),
    );

    const entries = (await Promise.all([pageEntries(), productEntries(), ingredientEntries()])).flat();

    expect(entries.map(({ url }) => url)).toEqual(
      expect.arrayContaining([
        "https://poudy.site/",
        "https://poudy.site/search/products",
        "https://poudy.site/search/ingredients",
        "https://poudy.site/categories",
        "https://poudy.site/saved",
        "https://poudy.site/categories/10",
        "https://poudy.site/categories/11",
        "https://poudy.site/brands/20",
        "https://poudy.site/products/30",
        "https://poudy.site/ingredients/40",
        "https://poudy.site/ingredients/5001",
      ]),
    );
    expect(api.fetchIngredients).toHaveBeenCalledTimes(2);
    expect(api.fetchProducts).toHaveBeenCalledTimes(1);
  });

  it("뒤쪽 제품 페이지가 실패해도 앞에서 찾은 제품 주소는 유지한다", async () => {
    api.fetchProducts.mockImplementation(({ page }: { readonly page: number }) => {
      if (page === 0) {
        return Promise.resolve({ items: [{ id: 30 }], pagination: { hasNext: true } });
      }
      return Promise.reject(new Error("second product page unavailable"));
    });

    const entries = await productEntries();

    expect(entries.map(({ url }) => url)).toContain("http://localhost:3000/products/30");
  });

  it("API가 모두 실패해도 고정 주소는 유지한다", async () => {
    api.fetchCategories.mockRejectedValue(new Error("categories unavailable"));
    api.fetchBrands.mockRejectedValue(new Error("brands unavailable"));
    api.fetchProducts.mockRejectedValue(new Error("products unavailable"));
    api.fetchIngredients.mockRejectedValue(new Error("ingredients unavailable"));

    await expect(pageEntries()).resolves.toHaveLength(6);
    await expect(productEntries()).resolves.toHaveLength(0);
    await expect(ingredientEntries()).resolves.toHaveLength(0);
  });

  /*
   * 예전에는 제품 10 페이지·성분 ID 10000 번에서 끊겨 그 뒤가 조용히 빠졌다.
   * 이제 상한은 색인 범위가 아니라 안전장치라, 그 자리를 넘겨도 계속 따라가야 한다.
   */
  it("예전 상한을 넘겨도 hasNext 를 따라 계속 싣는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");
    api.fetchProducts.mockImplementation(({ page }: { readonly page: number }) =>
      Promise.resolve({ items: [{ id: 1000 + page }], pagination: { hasNext: page < 20 } }),
    );
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) =>
      Promise.resolve({ items: [{ id: 2000 + page }], pagination: { hasNext: page < 120 } }),
    );

    const urls = (await Promise.all([productEntries(), ingredientEntries()])).flat().map(({ url }) => url);

    // 제품 11 번째 페이지는 예전 상한(10 페이지) 밖이다.
    expect(api.fetchProducts).toHaveBeenCalledTimes(21);
    expect(urls).toContain("https://poudy.site/products/1020");
    // 성분 101 번째 페이지는 예전 상한(ID 10000) 밖이다.
    expect(api.fetchIngredients).toHaveBeenCalledTimes(121);
    expect(urls).toContain("https://poudy.site/ingredients/2120");
  });

  it("뒤쪽 성분 페이지가 실패해도 앞에서 찾은 성분 주소는 유지한다", async () => {
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) => {
      if (page === 0) {
        return Promise.resolve({ items: [{ id: 40 }], pagination: { hasNext: true } });
      }
      return Promise.reject(new Error("second ingredient page unavailable"));
    });

    const entries = await ingredientEntries();

    expect(entries.map(({ url }) => url)).toContain("http://localhost:3000/ingredients/40");
  });
});
