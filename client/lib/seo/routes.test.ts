import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchBrands: vi.fn(),
  fetchCategories: vi.fn(),
  fetchIngredients: vi.fn(),
  fetchProducts: vi.fn(),
}));

vi.mock("@/lib/api/products", () => api);

import robots from "@/app/robots";
import { dynamic as ingredientSitemapDynamic, GET as ingredientsSitemap } from "@/app/sitemap-ingredients.xml/route";
import { dynamic as pageSitemapDynamic, GET as pagesSitemap } from "@/app/sitemap-pages.xml/route";
import { dynamic as productSitemapDynamic, GET as productsSitemap } from "@/app/sitemap-products.xml/route";
import { GET as sitemapIndex } from "@/app/sitemap.xml/route";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";
import { ingredientEntries, pageEntries, productEntries } from "@/lib/seo/sitemap";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
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
        disallow: ["/api/", "/products"],
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
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");
  });

  it("인덱스가 루트의 분할 사이트맵을 절대 주소로 연결한다", async () => {
    const response = sitemapIndex();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://poudy.site/sitemap-pages.xml</loc>");
    expect(xml).toContain("<loc>https://poudy.site/sitemap-products.xml</loc>");
    expect(xml).toContain("<loc>https://poudy.site/sitemap-ingredients.xml</loc>");
  });

  it("분할 사이트맵은 Next.js cache 없이 런타임에 만든다", () => {
    expect([pageSitemapDynamic, productSitemapDynamic, ingredientSitemapDynamic]).toEqual([
      "force-dynamic",
      "force-dynamic",
      "force-dynamic",
    ]);
  });

  it("비운영 환경에서는 API를 부르기 전에 모든 사이트맵을 404로 막는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");

    const responses = await Promise.all([sitemapIndex(), pagesSitemap(), productsSitemap(), ingredientsSitemap()]);

    expect(responses.map(({ status }) => status)).toEqual([404, 404, 404, 404]);
    expect(responses.map((response) => response.headers.get("Cache-Control"))).toEqual([
      "no-store",
      "no-store",
      "no-store",
      "no-store",
    ]);
    expect(api.fetchCategories).not.toHaveBeenCalled();
    expect(api.fetchBrands).not.toHaveBeenCalled();
    expect(api.fetchProducts).not.toHaveBeenCalled();
    expect(api.fetchIngredients).not.toHaveBeenCalled();
  });

  it("운영 분할 사이트맵이 완성된 API 결과만 XML 200으로 반환한다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchProducts.mockResolvedValue({ items: [{ id: 30 }], pagination: { hasNext: false } });
    api.fetchIngredients.mockResolvedValue({ items: [{ id: 40 }], pagination: { hasNext: false } });

    const responses = await Promise.all([pagesSitemap(), productsSitemap(), ingredientsSitemap()]);
    const xml = await Promise.all(responses.map((response) => response.text()));

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(xml[0]).toContain("<loc>https://poudy.site/categories/10</loc>");
    expect(xml[0]).toContain("<loc>https://poudy.site/brands/20</loc>");
    expect(xml[1]).toContain("<loc>https://poudy.site/products/30</loc>");
    expect(xml[2]).toContain("<loc>https://poudy.site/ingredients/40</loc>");
  });

  it("고정·카테고리·브랜드·제품·성분 상세 주소를 절대 주소로 만든다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [{ id: 11 }] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchProducts.mockResolvedValue({ items: [{ id: 30 }], pagination: { hasNext: false } });
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

  it("카테고리나 브랜드 API가 실패하면 페이지 사이트맵을 503으로 반환한다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchCategories.mockRejectedValue(new Error("categories unavailable"));
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });

    const response = await pagesSitemap();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it("뒤쪽 제품 페이지가 실패하면 부분 XML 대신 503을 반환한다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchProducts.mockImplementation(({ page }: { readonly page: number }) => {
      if (page === 0) return Promise.resolve({ items: [{ id: 30 }], pagination: { hasNext: true } });
      return Promise.reject(new Error("second product page unavailable"));
    });

    const response = await productsSitemap();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(api.fetchProducts).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it("뒤쪽 성분 페이지가 실패하면 부분 XML 대신 503을 반환한다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) => {
      if (page === 0) return Promise.resolve({ items: [{ id: 40 }], pagination: { hasNext: true } });
      return Promise.reject(new Error("second ingredient page unavailable"));
    });

    const response = await ingredientsSitemap();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it("예전 상한을 넘겨도 hasNext를 따라 계속 싣는다", async () => {
    api.fetchProducts.mockImplementation(({ page }: { readonly page: number }) =>
      Promise.resolve({ items: [{ id: 1000 + page }], pagination: { hasNext: page < 20 } }),
    );
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) =>
      Promise.resolve({ items: [{ id: 2000 + page }], pagination: { hasNext: page < 120 } }),
    );

    const urls = (await Promise.all([productEntries(), ingredientEntries()])).flat().map(({ url }) => url);

    expect(api.fetchProducts).toHaveBeenCalledTimes(21);
    expect(urls).toContain("https://poudy.site/products/1020");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(121);
    expect(urls).toContain("https://poudy.site/ingredients/2120");
  });

  it("제품 pagination이 500페이지 안에 끝나지 않으면 실패한다", async () => {
    api.fetchProducts.mockResolvedValue({ items: [{ id: 30 }], pagination: { hasNext: true } });

    await expect(productEntries()).rejects.toThrow("500페이지 안에 종료되지 않았습니다");
    expect(api.fetchProducts).toHaveBeenCalledTimes(500);
  });

  it("성분 pagination이 500페이지 안에 끝나지 않으면 실패한다", async () => {
    api.fetchIngredients.mockResolvedValue({ items: [{ id: 40 }], pagination: { hasNext: true } });

    await expect(ingredientEntries()).rejects.toThrow("500페이지 안에 종료되지 않았습니다");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(500);
  });
});
