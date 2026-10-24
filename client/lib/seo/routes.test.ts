import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchBrands: vi.fn(),
  fetchCategories: vi.fn(),
  fetchIngredientDetail: vi.fn(),
  fetchIngredients: vi.fn(),
  fetchSitemap: vi.fn(),
  fetchSitemapProducts: vi.fn(),
}));

vi.mock("@/lib/api/products", () => api);

const sitemapProduct = (id: number, updatedAt = "2000-01-01T09:30:00+09:00") => ({ id, updatedAt });

const emptySitemap = { categories: [], brands: [], curations: [], ingredients: [] };

import robots from "@/app/robots";
import { dynamic as rssDynamic, GET as rssFeed } from "@/app/rss.xml/route";
import { dynamic as ingredientSitemapDynamic, GET as ingredientsSitemap } from "@/app/sitemap-ingredients.xml/route";
import { dynamic as pageSitemapDynamic, GET as pagesSitemap } from "@/app/sitemap-pages.xml/route";
import { dynamic as productSitemapDynamic, GET as productsSitemap } from "@/app/sitemap-products.xml/route";
import { dynamic as sitemapIndexDynamic, GET as sitemapIndex } from "@/app/sitemap.xml/route";
import { DEFAULT_SIZE } from "@/lib/domain/filter";
import { RSS_ITEM_COUNT, rssIngredients } from "@/lib/seo/rss";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";
import { SCREEN_UPDATED_AT, ingredientEntries, pageEntries, productEntries } from "@/lib/seo/sitemap";
import { CRAWL_CASES, isAllowed, parseRobots, type RobotsRules } from "@/scripts/robots-rules.mjs";

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
        allow: ["/", "/products/", "/products?excludeCodes=", "/products?includeIngredientIds="],
        disallow: [
          "/api/",
          "/products",
          "/share/",
          "/products?includeIngredientIds=*&",
          "/products?includeIngredientIds=*,",
          "/products?includeIngredientIds=*%2C",
          "/products?includeIngredientIds=*%2c",
        ],
      },
      sitemap: "https://poudy.site/sitemap.xml",
      host: "https://poudy.site",
    });
  });

  describe("운영 규칙의 주소별 수집 허용", () => {
    const productionRules = (): RobotsRules => {
      vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
      const { rules } = robots();
      const group = [rules].flat()[0];
      return { allow: [group.allow ?? []].flat(), disallow: [group.disallow ?? []].flat() };
    };

    it.each(CRAWL_CASES.allowed)("%s 는 수집할 수 있다", (path) => {
      expect(isAllowed(productionRules(), path)).toBe(true);
    });

    it.each(CRAWL_CASES.blocked)("%s 는 수집하지 않는다", (path) => {
      expect(isAllowed(productionRules(), path)).toBe(false);
    });
  });

  it("판정은 가장 긴 규칙을 따르고 길이가 같으면 허용한다", () => {
    expect(isAllowed({ allow: ["/a"], disallow: ["/"] }, "/a/b")).toBe(true);
    expect(isAllowed({ allow: ["/a"], disallow: ["/a*"] }, "/a")).toBe(false);
    expect(isAllowed({ allow: ["/ab"], disallow: ["/a*"] }, "/ab")).toBe(true);
    expect(isAllowed({ allow: ["/$"], disallow: ["/"] }, "/x")).toBe(false);
    expect(isAllowed({ allow: [], disallow: [] }, "/x")).toBe(true);
  });

  it("배포된 robots.txt 를 같은 규칙으로 읽는다", () => {
    const text = [
      "User-Agent: *",
      "Allow: /",
      "Allow: /products?includeIngredientIds= # 성분 목록",
      "Disallow: /products",
      "",
      "Sitemap: https://poudy.site/sitemap.xml",
    ].join("\n");

    expect(parseRobots(text)).toEqual({ allow: ["/", "/products?includeIngredientIds="], disallow: ["/products"] });
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
    api.fetchCategories.mockResolvedValue({ items: [] });
    api.fetchBrands.mockResolvedValue({ items: [] });
    api.fetchSitemapProducts.mockResolvedValue({ items: [], pagination: { hasNext: false } });
    api.fetchIngredients.mockResolvedValue({ items: [], pagination: { hasNext: false } });

    const response = await sitemapIndex();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://poudy.site/sitemap-pages.xml</loc>");
    expect(xml).toContain("<loc>https://poudy.site/sitemap-products.xml</loc>");
    expect(xml).toContain("<loc>https://poudy.site/sitemap-ingredients.xml</loc>");
  });

  it("인덱스는 분할 사이트맵마다 그 안의 가장 늦은 lastmod 를 싣는다", async () => {
    api.fetchCategories.mockResolvedValue({ items: [] });
    api.fetchBrands.mockResolvedValue({ items: [] });
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      ingredients: [{ id: 40, updatedAt: "2099-11-07T01:00:00+09:00" }],
    });
    api.fetchSitemapProducts.mockResolvedValue({
      items: [sitemapProduct(30), sitemapProduct(31, "2099-11-02T01:00:00+09:00")],
      pagination: { hasNext: false },
    });
    api.fetchIngredients.mockResolvedValue({ items: [{ id: 40 }], pagination: { hasNext: false } });

    const xml = await (await sitemapIndex()).text();
    const { home, about, search, category, brand } = SCREEN_UPDATED_AT;
    const latestPage = [home, about, search, category, brand].sort().at(-1);

    expect(xml).toContain(
      `<sitemap><loc>https://poudy.site/sitemap-pages.xml</loc><lastmod>${latestPage}</lastmod></sitemap>`,
    );
    expect(xml).toContain(
      "<sitemap><loc>https://poudy.site/sitemap-products.xml</loc><lastmod>2099-11-02</lastmod></sitemap>",
    );
    expect(xml).toContain(
      "<sitemap><loc>https://poudy.site/sitemap-ingredients.xml</loc><lastmod>2099-11-07</lastmod></sitemap>",
    );
  });

  it("lastmod 를 셈하지 못하면 인덱스를 lastmod 없이 200 으로 내보낸다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchCategories.mockRejectedValue(new Error("categories unavailable"));
    api.fetchBrands.mockResolvedValue({ items: [] });
    api.fetchSitemapProducts.mockResolvedValue({ items: [], pagination: { hasNext: false } });
    api.fetchIngredients.mockResolvedValue({ items: [], pagination: { hasNext: false } });

    const response = await sitemapIndex();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("<sitemap><loc>https://poudy.site/sitemap-pages.xml</loc></sitemap>");
    expect(xml).not.toContain("<lastmod>");
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it("인덱스와 분할 사이트맵은 Next.js cache 없이 런타임에 만든다", () => {
    expect([sitemapIndexDynamic, pageSitemapDynamic, productSitemapDynamic, ingredientSitemapDynamic]).toEqual([
      "force-dynamic",
      "force-dynamic",
      "force-dynamic",
      "force-dynamic",
    ]);
  });

  it("비운영 환경에서는 API를 부르기 전에 모든 사이트맵을 404로 막는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");

    const responses = await Promise.all([
      sitemapIndex(),
      pagesSitemap(),
      productsSitemap(),
      ingredientsSitemap(),
      rssFeed(),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([404, 404, 404, 404, 404]);
    expect(responses.map((response) => response.headers.get("Cache-Control"))).toEqual([
      "no-store",
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
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      curations: [{ id: 50, updatedAt: "2000-01-01T09:30:00+09:00" }],
    });
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
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      curations: [{ id: 50, updatedAt: "2000-01-01T09:30:00+09:00" }],
    });
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
        "https://poudy.site/about",
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
    expect(entries.map(({ url }) => url)).not.toContain("https://poudy.site/my-page/wishlist");
    expect(api.fetchIngredients).toHaveBeenCalledTimes(2);
    expect(api.fetchSitemapProducts).toHaveBeenCalledTimes(1);
  });

  it("기본 목록 크기 기준의 실제 마지막 장까지만 브랜드·부모·자식 카테고리를 등록한다", async () => {
    api.fetchCategories.mockResolvedValue({
      items: [
        {
          id: 10,
          productCount: DEFAULT_SIZE * 2,
          children: [
            { id: 11, productCount: DEFAULT_SIZE + 1 },
            { id: 12, productCount: DEFAULT_SIZE },
          ],
        },
      ],
    });
    api.fetchBrands.mockResolvedValue({
      items: [
        { id: 20, productCount: DEFAULT_SIZE * 2 + 1 },
        { id: 21, productCount: 0 },
      ],
    });
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      brands: [{ id: 20, updatedAt: "2099-01-01T09:00:00+09:00" }],
    });

    const entries = await pageEntries();
    const paginated = entries.filter(({ url }) => url.includes("?"));

    expect(paginated.map(({ url }) => url)).toEqual([
      "https://poudy.site/categories/10?page=2",
      "https://poudy.site/categories/11?page=2",
      "https://poudy.site/brands/20?page=2",
      "https://poudy.site/brands/20?page=3",
    ]);
    expect(paginated.slice(2).map(({ lastModified }) => lastModified)).toEqual(["2099-01-01", "2099-01-01"]);
    expect(new Set(entries.map(({ url }) => url)).size).toBe(entries.length);
    const xml = await (await pagesSitemap()).text();
    expect(xml).toContain("<loc>https://poudy.site/brands/20?page=3</loc>");
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
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      curations: [{ id: 50, updatedAt: "2000-01-01T09:30:00+09:00" }],
    });

    const entries = await pageEntries();
    const lastModifiedOf = (path: string) =>
      entries.find(({ url }) => url === `https://poudy.site${path}`)?.lastModified;

    expect(lastModifiedOf("/")).toBe(SCREEN_UPDATED_AT.home);
    expect(lastModifiedOf("/about")).toBe(SCREEN_UPDATED_AT.about);
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
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      curations: [{ id: 50, updatedAt: "2000-01-01T09:30:00+09:00" }],
    });
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
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      curations: [{ id: 50, updatedAt: "2000-01-01T09:30:00+09:00" }],
    });

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
    api.fetchSitemap.mockResolvedValue({
      ...emptySitemap,
      curations: [{ id: 50, updatedAt: "2000-01-01T09:30:00+09:00" }],
    });

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

describe("rss", () => {
  const ingredient = (id: number) => ({
    id,
    koreanName: `성분 ${id}`,
    englishName: `Ingredient ${id}`,
    skinEffects: [],
  });
  const detail = (id: number, updatedAt = "2026-10-20T09:30:00+09:00") => ({
    id,
    koreanName: `성분 ${id}`,
    englishName: `Ingredient,${id}`,
    description: "피부를 <촉촉하게> 지켜요 & 진정",
    formulationRoles: [{ id: "HUMECTANT", code: "HUMECTANT", name: "보습제" }],
    skinEffects: [{ id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "수분" }],
    groupCodes: [],
    productCount: 46,
    products: [
      {
        id: 314,
        name: "수분 크림",
        brand: { id: 19, name: "라운드랩", englishName: null, imageUrl: "https://image.example/brand.webp" },
        imageUrl: "https://image.example/product.webp",
        price: 1000,
        volumeValue: 50,
        volumeUnit: "ml",
        moistureLevel: null,
        oilLevel: null,
      },
    ],
    infoSources: ["식품의약품안전처"],
    effectSources: ["Antioxidant Study (Lee et al., 2020) https://pubmed.ncbi.nlm.nih.gov/12345/"],
    updatedAt,
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");
  });

  it("성분 사이트맵과 같은 순서의 앞쪽 성분을 상세까지 받아 싣는다", async () => {
    api.fetchIngredients.mockResolvedValue({ items: [ingredient(40), ingredient(41)], pagination: { hasNext: true } });
    api.fetchIngredientDetail.mockImplementation((id: number) => Promise.resolve(detail(id)));

    const ingredients = await rssIngredients();

    expect(ingredients.map(({ id }) => id)).toEqual([40, 41]);
    expect(api.fetchIngredients).toHaveBeenCalledWith({ page: 1, size: RSS_ITEM_COUNT, usedInProducts: true });
    expect(api.fetchIngredientDetail.mock.calls).toEqual([
      [40, 3],
      [41, 3],
    ]);
  });

  it("item 마다 성분 상세 본문 전체를 싣고 다른 도메인 주소는 넣지 않는다", async () => {
    api.fetchIngredients.mockResolvedValue({ items: [ingredient(40), ingredient(41)], pagination: { hasNext: false } });
    api.fetchIngredientDetail.mockImplementation((id: number) =>
      Promise.resolve(detail(id, id === 41 ? "2026-10-22T09:30:00+09:00" : "2026-10-20T09:30:00+09:00")),
    );

    const response = await rssFeed();
    const xml = await response.text();

    expect(rssDynamic).toBe("force-dynamic");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/rss+xml; charset=utf-8");
    expect(xml).toContain('<rss version="2.0"><channel>');
    expect(xml).toContain("<lastBuildDate>Thu, 22 Oct 2026 00:30:00 GMT</lastBuildDate>");
    expect(xml).toContain(
      "<item><title>성분 41 성분 정보</title><link>https://poudy.site/ingredients/41</link><description>",
    );
    expect(xml).toContain(
      '</description><guid isPermaLink="true">https://poudy.site/ingredients/41</guid><pubDate>Thu, 22 Oct 2026 00:30:00 GMT</pubDate></item>',
    );
    expect(xml).toContain("&lt;h1&gt;성분 41&lt;/h1&gt;&lt;p&gt;영문 이름: Ingredient, 41&lt;/p&gt;");
    expect(xml).toContain("&lt;p&gt;피부를 &amp;lt;촉촉하게&amp;gt; 지켜요 &amp;amp; 진정&lt;/p&gt;");
    expect(xml).toContain("&lt;h2&gt;배합 목적&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;보습제&lt;/li&gt;&lt;/ul&gt;");
    expect(xml).toContain(
      "&lt;h2&gt;이 성분이 든 제품 46개&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;&lt;a href=&quot;https://poudy.site/products/314&quot;&gt;라운드랩 수분 크림&lt;/a&gt;",
    );
    expect(xml).toContain("업데이트 날짜: 2026-10-22");
    expect(xml).toContain(
      "&lt;h2&gt;성분 작용 출처&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;Antioxidant Study (Lee et al., 2020)&lt;/li&gt;",
    );
    expect(xml).not.toContain("pubmed");
    expect(xml).not.toContain("image.example");
  });

  it("성분 API가 실패하면 503으로 반환한다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.fetchIngredients.mockResolvedValue({ items: [ingredient(40)], pagination: { hasNext: false } });
    api.fetchIngredientDetail.mockRejectedValue(new Error("ingredient unavailable"));

    const response = await rssFeed();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(errorLog).toHaveBeenCalledOnce();
  });
});
