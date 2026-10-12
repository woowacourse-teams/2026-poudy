import type { ProductResponse } from "@poudy/api/api.zod";
import type { MetadataRoute } from "next";

import {
  fetchBrands,
  fetchCategories,
  fetchCurations,
  fetchIngredients,
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
 * 화면이 검색 결과에 내보이는 것 - 본문 문구, 제목, 설명 - 이 마지막으로 바뀐 날.
 * 그 화면의 문구를 고칠 때 함께 고친다.
 *
 * 배포 시각을 쓰지 않는다. 문구를 건드리지 않은 배포까지 바뀌었다고 말하게 되고, 값이
 * 실제보다 새로우면 검색 엔진이 사이트맵의 lastmod 를 통째로 믿지 않는다.
 *
 * 목록이 API 에서 오는 화면은 언제 바뀌었는지 여기서 알 수 없어 담지 않는다.
 */
const CONTENT_UPDATED_AT: Readonly<Record<string, string>> = {
  "/": "2026-09-05",
  "/search/products": "2026-08-30",
  "/search/ingredients": "2026-08-30",
};

/**
 * 제품 상세 화면의 본문 문구·구성이 바뀌어 운영(main)에 나간 날. 제품마다 데이터가 바뀐 날과 견줘 늦은 쪽을
 * lastmod 로 쓴다. 손으로 고치지 않는다. main 으로 가는 PR 이 열리면 Client Product Lastmod 워크플로가 고친다.
 */
const PRODUCT_DETAIL_CONTENT_UPDATED_AT = "2026-10-11";

type ChangeFrequency = "daily" | "weekly" | "monthly";

const entry = (path: string, changeFrequency: ChangeFrequency, priority: number): MetadataRoute.Sitemap[number] => {
  const url = absoluteUrl(path);
  const lastModified = CONTENT_UPDATED_AT[path];
  if (!lastModified) return { url, changeFrequency, priority };

  return { url, changeFrequency, priority, lastModified };
};

const productLastModified = (updatedAt: string): string => {
  const dataUpdatedOn = updatedAt.slice(0, "YYYY-MM-DD".length);
  if (dataUpdatedOn > PRODUCT_DETAIL_CONTENT_UPDATED_AT) return dataUpdatedOn;

  return PRODUCT_DETAIL_CONTENT_UPDATED_AT;
};

const productEntry = ({ id, updatedAt }: Pick<ProductResponse, "id" | "updatedAt">): MetadataRoute.Sitemap[number] => ({
  ...entry(`/products/${id}`, "weekly", 0.8),
  lastModified: productLastModified(updatedAt),
});

export const pageEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = [
    entry("/", "weekly", 1),
    entry("/search/products", "weekly", 0.9),
    entry("/search/ingredients", "weekly", 0.9),
    entry("/categories", "weekly", 0.8),
    // 저장함은 기기마다 담긴 것이 달라 크롤러에게는 늘 빈 화면이다. 색인을 바라지 않으니 알리지 않는다.
    entry("/brands", "weekly", 0.8),
  ];
  const [categories, brands, curations] = await Promise.all([fetchCategories(), fetchBrands(), fetchCurations()]);

  entries.push(
    ...categories.items
      .flatMap((category) => [category, ...category.children])
      .map(({ id }) => entry(`/categories/${id}`, "weekly", 0.7)),
    ...brands.items.map(({ id }) => entry(`/brands/${id}`, "weekly", 0.7)),
    /* 게시 중인 기획전만 목록에 오르므로 받은 것을 그대로 싣는다. */
    ...curations.items.map(({ id }) => entry(`/curations/${id}`, "weekly", 0.7)),
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
  const entries: MetadataRoute.Sitemap = [];

  for (let page = FIRST_PAGE; page < FIRST_PAGE + MAX_INGREDIENT_PAGES; page += 1) {
    const response = await fetchIngredients({ page, size: INGREDIENT_PAGE_SIZE, usedInProducts: true });
    entries.push(...response.items.map((ingredient) => entry(`/ingredients/${ingredient.id}`, "monthly", 0.7)));
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
