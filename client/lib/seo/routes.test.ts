import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchBrands: vi.fn(),
  fetchCategories: vi.fn(),
  fetchCurations: vi.fn(),
  fetchIngredients: vi.fn(),
  fetchSitemap: vi.fn(),
  fetchSitemapProducts: vi.fn(),
}));

vi.mock("@/lib/api/products", () => api);

const sitemapProduct = (id: number, updatedAt = "2000-01-01T09:30:00+09:00") => ({ id, updatedAt });

const emptySitemap = { categories: [], brands: [], curations: [], ingredients: [] };

import robots from "@/app/robots";
import { dynamic as ingredientSitemapDynamic, GET as ingredientsSitemap } from "@/app/sitemap-ingredients.xml/route";
import { dynamic as pageSitemapDynamic, GET as pagesSitemap } from "@/app/sitemap-pages.xml/route";
import { dynamic as productSitemapDynamic, GET as productsSitemap } from "@/app/sitemap-products.xml/route";
import { GET as sitemapIndex } from "@/app/sitemap.xml/route";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";
import { SCREEN_UPDATED_AT, ingredientEntries, pageEntries, productEntries } from "@/lib/seo/sitemap";

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
        allow: ["/", "/products/", "/products?excludeCodes="],
        disallow: ["/api/", "/products", "/share/"],
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
    api.fetchSitemap.mockResolvedValue(emptySitemap);
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
    expect(api.fetchSitemapProducts).not.toHaveBeenCalled();
    expect(api.fetchIngredients).not.toHaveBeenCalled();
  });

  it("운영 분할 사이트맵이 완성된 API 결과만 XML 200으로 반환한다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchCurations.mockResolvedValue({ items: [{ id: 50 }] });
    api.fetchSitemapProducts.mockResolvedValue({ items: [sitemapProduct(30)], pagination: { hasNext: false } });
    api.fetchIngredients.mockResolvedValue({ items: [{ id: 40 }], pagination: { hasNext: false } });

    const responses = await Promise.all([pagesSitemap(), productsSitemap(), ingredientsSitemap()]);
    const xml = await Promise.all(responses.map((response) => response.text()));

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(xml[0]).toContain("<loc>https://poudy.site/categories/10</loc>");
    expect(xml[0]).toContain("<loc>https://poudy.site/brands/20</loc>");
    expect(xml[0]).toContain("<loc>https://poudy.site/curations/50</loc>");
    expect(xml[1]).toContain("<loc>https://poudy.site/products/30</loc>");
    expect(xml[2]).toContain("<loc>https://poudy.site/ingredients/40</loc>");
  });

  it("고정·카테고리·브랜드·제품·성분 상세 주소를 절대 주소로 만든다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [{ id: 11 }] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchCurations.mockResolvedValue({ items: [{ id: 50 }] });
    api.fetchSitemapProducts.mockResolvedValue({ items: [sitemapProduct(30)], pagination: { hasNext: false } });
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) =>
      Promise.resolve({
        items: page === 1 ? [{ id: 40 }] : [{ id: 5001 }],
        pagination: { hasNext: page === 1 },
      }),
    );

    const entries = (await Promise.all([pageEntries(), productEntries(), ingredientEntries()])).flat();

    expect(entries.map(({ url }) => url)).toEqual(
      expect.arrayContaining([
        "https://poudy.site/",
        "https://poudy.site/search/products",
        "https://poudy.site/search/ingredients",
        "https://poudy.site/categories",
        "https://poudy.site/categories/10",
        "https://poudy.site/categories/11",
        "https://poudy.site/brands/20",
        "https://poudy.site/curations/50",
        "https://poudy.site/products/30",
        "https://poudy.site/ingredients/40",
        "https://poudy.site/ingredients/5001",
      ]),
    );
    expect(entries.map(({ url }) => url)).not.toContain("https://poudy.site/wishlist");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(2);
    expect(api.fetchSitemapProducts).toHaveBeenCalledTimes(1);
  });

  it("제품 사이트맵은 등록순 API의 페이지 순서를 그대로 유지한다", async () => {
    api.fetchSitemapProducts.mockImplementation((page: number) =>
      Promise.resolve({
        items: page === 1 ? [sitemapProduct(30), sitemapProduct(10)] : [sitemapProduct(20)],
        pagination: { hasNext: page === 1 },
      }),
    );

    const entries = await productEntries();

    expect(entries.map(({ url }) => url)).toEqual([
      "https://poudy.site/products/30",
      "https://poudy.site/products/10",
      "https://poudy.site/products/20",
    ]);
    expect(api.fetchSitemapProducts.mock.calls).toEqual([
      [1, 100],
      [2, 100],
    ]);
  });

  it("제품 lastmod 는 데이터가 바뀐 날과 상세 화면 문구가 바뀐 날 중 늦은 쪽이다", async () => {
    api.fetchSitemapProducts.mockResolvedValue({
      items: [sitemapProduct(30, "2000-01-01T09:30:00+09:00"), sitemapProduct(31, "2099-11-02T01:00:00+09:00")],
      pagination: { hasNext: false },
    });

    const entries = await productEntries();
    const xml = await (await productsSitemap()).text();

    expect(entries.map(({ lastModified }) => lastModified)).toEqual([SCREEN_UPDATED_AT.product, "2099-11-02"]);
    expect(xml).toContain(
      "<url><loc>https://poudy.site/products/31</loc><lastmod>2099-11-02</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>",
    );
  });

  it("데이터가 없는 화면은 화면 기준일을 lastmod 로 싣는다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchCurations.mockResolvedValue({ items: [{ id: 50 }] });

    const entries = await pageEntries();
    const lastModifiedOf = (path: string) =>
      entries.find(({ url }) => url === `https://poudy.site${path}`)?.lastModified;

    expect(lastModifiedOf("/")).toBe(SCREEN_UPDATED_AT.home);
    expect(lastModifiedOf("/search/products")).toBe(SCREEN_UPDATED_AT.search);
    expect(lastModifiedOf("/search/ingredients")).toBe(SCREEN_UPDATED_AT.search);
    expect(lastModifiedOf("/categories")).toBe(SCREEN_UPDATED_AT.category);
    expect(lastModifiedOf("/brands")).toBe(SCREEN_UPDATED_AT.brand);
    expect(lastModifiedOf("/categories/10")).toBe(SCREEN_UPDATED_AT.category);
    expect(lastModifiedOf("/brands/20")).toBe(SCREEN_UPDATED_AT.brand);
    expect(lastModifiedOf("/curations/50")).toBe(SCREEN_UPDATED_AT.curation);
  });

  it("카테고리·브랜드·큐레이션은 데이터가 바뀐 날이 늦으면 그날을 lastmod 로 싣는다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [{ id: 11 }] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }, { id: 21 }] });
    api.fetchCurations.mockResolvedValue({ items: [{ id: 50 }] });
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      categories: [
        { id: 10, updatedAt: "2099-11-02T01:00:00+09:00" },
        { id: 11, updatedAt: "2000-01-01T09:30:00+09:00" },
      ],
      brands: [
        { id: 20, updatedAt: "2099-11-03T01:00:00+09:00" },
        { id: 21, updatedAt: "2099-11-04T01:00:00+09:00" },
      ],
      curations: [{ id: 50, updatedAt: "2099-11-05T01:00:00+09:00" }],
    });

    const entries = await pageEntries();
    const lastModifiedOf = (path: string) =>
      entries.find(({ url }) => url === `https://poudy.site${path}`)?.lastModified;

    expect(lastModifiedOf("/categories")).toBe("2099-11-02");
    expect(lastModifiedOf("/categories/10")).toBe("2099-11-02");
    expect(lastModifiedOf("/categories/11")).toBe(SCREEN_UPDATED_AT.category);
    expect(lastModifiedOf("/brands")).toBe("2099-11-04");
    expect(lastModifiedOf("/brands/20")).toBe("2099-11-03");
    expect(lastModifiedOf("/curations/50")).toBe("2099-11-05");
  });

  it("성분 lastmod 는 데이터가 바뀐 날과 성분 화면 기준일 중 늦은 쪽이다", async () => {
    api.fetchIngredients.mockResolvedValue({ items: [{ id: 40 }, { id: 41 }], pagination: { hasNext: false } });
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      ingredients: [
        { id: 40, updatedAt: "2000-01-01T09:30:00+09:00" },
        { id: 41, updatedAt: "2099-11-06T01:00:00+09:00" },
      ],
    });

    const entries = await ingredientEntries();

    expect(entries.map(({ lastModified }) => lastModified)).toEqual([SCREEN_UPDATED_AT.ingredient, "2099-11-06"]);
  });

  it("사이트맵 XML 이 lastmod 를 스키마 순서대로 적는다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [{ id: 10, children: [] }] });
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchCurations.mockResolvedValue({ items: [{ id: 50 }] });

    const xml = await (await pagesSitemap()).text();

    expect(xml).toContain(
      `<url><loc>https://poudy.site/</loc><lastmod>${SCREEN_UPDATED_AT.home}</lastmod><changefreq>weekly</changefreq><priority>1</priority></url>`,
    );
    expect(xml).toContain(
      `<url><loc>https://poudy.site/brands/20</loc><lastmod>${SCREEN_UPDATED_AT.brand}</lastmod><changefreq>weekly</changefreq>`,
    );
  });

  it("카테고리나 브랜드 API가 실패하면 페이지 사이트맵을 503으로 반환한다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchCategories.mockRejectedValue(new Error("categories unavailable"));
    api.fetchBrands.mockResolvedValue({ items: [{ id: 20 }] });
    api.fetchCurations.mockResolvedValue({ items: [{ id: 50 }] });

    const response = await pagesSitemap();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it("뒤쪽 제품 페이지가 실패하면 부분 XML 대신 503을 반환한다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchSitemapProducts.mockImplementation((page: number) => {
      if (page === 1) return Promise.resolve({ items: [sitemapProduct(30)], pagination: { hasNext: true } });
      return Promise.reject(new Error("second product page unavailable"));
    });

    const response = await productsSitemap();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(api.fetchSitemapProducts).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it("뒤쪽 성분 페이지가 실패하면 부분 XML 대신 503을 반환한다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) => {
      if (page === 1) return Promise.resolve({ items: [{ id: 40 }], pagination: { hasNext: true } });
      return Promise.reject(new Error("second ingredient page unavailable"));
    });

    const response = await ingredientsSitemap();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it("예전 상한을 넘겨도 hasNext를 따라 계속 싣는다", async () => {
    api.fetchSitemapProducts.mockImplementation((page: number) =>
      Promise.resolve({ items: [sitemapProduct(1000 + page)], pagination: { hasNext: page < 21 } }),
    );
    api.fetchIngredients.mockImplementation(({ page }: { readonly page: number }) =>
      Promise.resolve({ items: [{ id: 2000 + page }], pagination: { hasNext: page < 121 } }),
    );

    const urls = (await Promise.all([productEntries(), ingredientEntries()])).flat().map(({ url }) => url);

    expect(api.fetchSitemapProducts).toHaveBeenCalledTimes(21);
    expect(urls).toContain("https://poudy.site/products/1021");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(121);
    expect(urls).toContain("https://poudy.site/ingredients/2121");
  });

  it("제품 pagination이 500페이지 안에 끝나지 않으면 실패한다", async () => {
    api.fetchSitemapProducts.mockResolvedValue({ items: [sitemapProduct(30)], pagination: { hasNext: true } });

    await expect(productEntries()).rejects.toThrow("500페이지 안에 종료되지 않았습니다");
    expect(api.fetchSitemapProducts).toHaveBeenCalledTimes(500);
  });

  it("성분 pagination이 500페이지 안에 끝나지 않으면 실패한다", async () => {
    api.fetchIngredients.mockResolvedValue({ items: [{ id: 40 }], pagination: { hasNext: true } });

    await expect(ingredientEntries()).rejects.toThrow("500페이지 안에 종료되지 않았습니다");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(500);
  });
});
