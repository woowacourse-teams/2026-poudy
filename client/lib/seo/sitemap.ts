import type { ProductResponse, SitemapEntryResponse } from "@poudy/api/api.zod";
import type { MetadataRoute } from "next";

import {
  fetchBrands,
  fetchCategories,
  fetchCurations,
  fetchIngredients,
  fetchSitemap,
  fetchSitemapProducts,
} from "@/lib/api/products";
import { FIRST_PAGE } from "@/lib/domain/filter";
import { absoluteUrl } from "@/lib/seo/site";

export const SITEMAP_PATHS = {
  pages: "/sitemap-pages.xml",
  products: "/sitemap-products.xml",
  ingredients: "/sitemap-ingredients.xml",
} as const;

const SITEMAP_URL_LIMIT = 50000;
const PRODUCT_PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = SITEMAP_URL_LIMIT / PRODUCT_PAGE_SIZE;
const INGREDIENT_PAGE_SIZE = 100;
const MAX_INGREDIENT_PAGES = SITEMAP_URL_LIMIT / INGREDIENT_PAGE_SIZE;

/**
 * 화면마다 검색 결과에 내보이는 것 - 본문 문구, 구성, 제목, 설명 - 이 바뀌어 운영(main)에 나간 날.
 * 데이터가 있는 화면은 데이터가 바뀐 날과 견줘 늦은 쪽을 lastmod 로 쓴다.
 *
 * 손으로 고치지 않는다. main 으로 가는 PR 에 lastmod:<화면> 라벨을 달면 Client Lastmod 워크플로가
 * 그 화면의 날짜를 그날로 고친다.
 *
 * 배포 시각을 쓰지 않는다. 문구를 건드리지 않은 배포까지 바뀌었다고 말하게 되고, 값이
 * 실제보다 새로우면 검색 엔진이 사이트맵의 lastmod 를 통째로 믿지 않는다.
 */
const SCREEN_UPDATED_AT = {
  home: "2026-09-05",
  search: "2026-08-30",
  category: "2026-10-09",
  brand: "2026-10-09",
  curation: "2026-10-09",
  product: "2026-10-12",
  ingredient: "2026-10-09",
} as const;

type Screen = keyof typeof SCREEN_UPDATED_AT;

type ChangeFrequency = "daily" | "weekly" | "monthly";

type Page = { readonly screen: Screen; readonly changeFrequency: ChangeFrequency; readonly priority: number };

const PAGES = {
  home: { screen: "home", changeFrequency: "weekly", priority: 1 },
  search: { screen: "search", changeFrequency: "weekly", priority: 0.9 },
  categories: { screen: "category", changeFrequency: "weekly", priority: 0.8 },
  category: { screen: "category", changeFrequency: "weekly", priority: 0.7 },
  brands: { screen: "brand", changeFrequency: "weekly", priority: 0.8 },
  brand: { screen: "brand", changeFrequency: "weekly", priority: 0.7 },
  curation: { screen: "curation", changeFrequency: "weekly", priority: 0.7 },
  product: { screen: "product", changeFrequency: "weekly", priority: 0.8 },
  ingredient: { screen: "ingredient", changeFrequency: "monthly", priority: 0.7 },
} as const satisfies Readonly<Record<string, Page>>;

const dateOf = (dateTime: string): string => dateTime.slice(0, "YYYY-MM-DD".length);

const lastModifiedOf = (screen: Screen, dataUpdatedAt: string | undefined): string => {
  const screenUpdatedOn = SCREEN_UPDATED_AT[screen];
  if (dataUpdatedAt === undefined) return screenUpdatedOn;

  const dataUpdatedOn = dateOf(dataUpdatedAt);
  if (dataUpdatedOn > screenUpdatedOn) return dataUpdatedOn;

  return screenUpdatedOn;
};

const entry = (path: string, page: Page, dataUpdatedAt?: string): MetadataRoute.Sitemap[number] => ({
  url: absoluteUrl(path),
  changeFrequency: page.changeFrequency,
  priority: page.priority,
  lastModified: lastModifiedOf(page.screen, dataUpdatedAt),
});

const updatedAtById = (updates: readonly SitemapEntryResponse[]): ReadonlyMap<number, string> =>
  new Map(updates.map(({ id, updatedAt }) => [id, updatedAt]));

const latestOf = (updates: readonly SitemapEntryResponse[]): string | undefined =>
  updates
    .map(({ updatedAt }) => dateOf(updatedAt))
    .sort()
    .at(-1);

const productEntry = ({ id, updatedAt }: Pick<ProductResponse, "id" | "updatedAt">): MetadataRoute.Sitemap[number] =>
  entry(`/products/${id}`, PAGES.product, updatedAt);

export const pageEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const [categories, brands, curations, sitemap] = await Promise.all([
    fetchCategories(),
    fetchBrands(),
    fetchCurations(),
    fetchSitemap(),
  ]);
  const categoryUpdates = updatedAtById(sitemap.categories);
  const brandUpdates = updatedAtById(sitemap.brands);
  const curationUpdates = updatedAtById(sitemap.curations);
  const entries: MetadataRoute.Sitemap = [
    entry("/", PAGES.home),
    entry("/search/products", PAGES.search),
    entry("/search/ingredients", PAGES.search),
    entry("/categories", PAGES.categories, latestOf(sitemap.categories)),
    // 저장함은 기기마다 담긴 것이 달라 크롤러에게는 늘 빈 화면이다. 색인을 바라지 않으니 알리지 않는다.
    entry("/brands", PAGES.brands, latestOf(sitemap.brands)),
  ];

  entries.push(
    ...categories.items
      .flatMap((category) => [category, ...category.children])
      .map(({ id }) => entry(`/categories/${id}`, PAGES.category, categoryUpdates.get(id))),
    ...brands.items.map(({ id }) => entry(`/brands/${id}`, PAGES.brand, brandUpdates.get(id))),
    /* 게시 중인 기획전만 목록에 오르므로 받은 것을 그대로 싣는다. */
    ...curations.items.map(({ id }) => entry(`/curations/${id}`, PAGES.curation, curationUpdates.get(id))),
  );

  if (entries.length > SITEMAP_URL_LIMIT) throw new Error("페이지 사이트맵이 URL 50,000개 제한을 초과했습니다.");

  return entries;
};

export const productEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = [];

  for (let page = FIRST_PAGE; page < FIRST_PAGE + MAX_PRODUCT_PAGES; page += 1) {
    const response = await fetchSitemapProducts(page, PRODUCT_PAGE_SIZE);
    entries.push(...response.items.map(productEntry));
    if (entries.length > SITEMAP_URL_LIMIT) throw new Error("제품 사이트맵이 URL 50,000개 제한을 초과했습니다.");
    if (!response.pagination.hasNext) return entries;
  }

  throw new Error("제품 사이트맵 pagination이 500페이지 안에 종료되지 않았습니다.");
};

export const ingredientEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const ingredientUpdates = updatedAtById((await fetchSitemap()).ingredients);
  const entries: MetadataRoute.Sitemap = [];

  for (let page = FIRST_PAGE; page < FIRST_PAGE + MAX_INGREDIENT_PAGES; page += 1) {
    const response = await fetchIngredients({ page, size: INGREDIENT_PAGE_SIZE, usedInProducts: true });
    entries.push(
      ...response.items.map(({ id }) => entry(`/ingredients/${id}`, PAGES.ingredient, ingredientUpdates.get(id))),
    );
    if (entries.length > SITEMAP_URL_LIMIT) throw new Error("성분 사이트맵이 URL 50,000개 제한을 초과했습니다.");
    if (!response.pagination.hasNext) return entries;
  }

  throw new Error("성분 사이트맵 pagination이 500페이지 안에 종료되지 않았습니다.");
};

const lastmodTag = (lastModified: MetadataRoute.Sitemap[number]["lastModified"]): string =>
  optionalTag("lastmod", lastModified?.toString());

const escapeXml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const optionalTag = (name: string, value: string | number | undefined): string => {
  if (value === undefined) return "";

  return `<${name}>${value}</${name}>`;
};

/** 사이트맵 스키마가 정한 자식 순서는 loc, lastmod, changefreq, priority 다. */
export const sitemapXml = (entries: MetadataRoute.Sitemap): string => {
  const urls = entries
    .map(
      ({ url, lastModified, changeFrequency, priority }) =>
        `<url><loc>${escapeXml(url)}</loc>${lastmodTag(lastModified)}${optionalTag("changefreq", changeFrequency)}${optionalTag("priority", priority)}</url>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
};

export const sitemapIndexXml = (urls: readonly string[]): string => {
  const sitemaps = urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}</sitemapindex>`;
};

export const xmlResponse = (body: string): Response =>
  new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
