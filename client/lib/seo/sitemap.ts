import type { MetadataRoute } from "next";

import { fetchBrands, fetchCategories, fetchIngredients, fetchProducts } from "@/lib/api/products";
import { EMPTY_FILTER } from "@/lib/domain/filter";
import { absoluteUrl } from "@/lib/seo/site";

export const SITEMAP_PATHS = {
  pages: "/sitemaps/pages.xml",
  products: "/sitemaps/products.xml",
  ingredients: "/sitemaps/ingredients.xml",
} as const;

const SITEMAP_URL_LIMIT = 50000;
const PRODUCT_PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = SITEMAP_URL_LIMIT / PRODUCT_PAGE_SIZE;
const INGREDIENT_PAGE_SIZE = 100;
const MAX_INGREDIENT_PAGES = SITEMAP_URL_LIMIT / INGREDIENT_PAGE_SIZE;

const entry = (path: string, changeFrequency: "daily" | "weekly" | "monthly", priority: number) => ({
  url: absoluteUrl(path),
  changeFrequency,
  priority,
});

export const pageEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = [
    entry("/", "weekly", 1),
    entry("/search/products", "weekly", 0.9),
    entry("/search/ingredients", "weekly", 0.9),
    entry("/categories", "weekly", 0.8),
    entry("/saved", "monthly", 0.7),
    entry("/brands", "weekly", 0.8),
  ];
  const [categories, brands] = await Promise.allSettled([fetchCategories(), fetchBrands()]);

  if (categories.status === "fulfilled") {
    entries.push(
      ...categories.value.items
        .flatMap((category) => [category, ...category.children])
        .map(({ id }) => entry(`/categories/${id}`, "weekly", 0.7)),
    );
  }
  if (brands.status === "fulfilled") {
    entries.push(...brands.value.items.map(({ id }) => entry(`/brands/${id}`, "weekly", 0.7)));
  }

  return entries;
};

export const productEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = [];

  for (let page = 0; page < MAX_PRODUCT_PAGES; page += 1) {
    const [result] = await Promise.allSettled([fetchProducts({ ...EMPTY_FILTER, page, size: PRODUCT_PAGE_SIZE })]);
    if (result.status === "rejected") break;

    const response = result.value;
    entries.push(...response.items.map((product) => entry(`/products/${product.id}`, "weekly", 0.8)));
    if (!response.pagination.hasNext) break;
  }

  return entries;
};

export const ingredientEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const entries: MetadataRoute.Sitemap = [];

  for (let page = 0; page < MAX_INGREDIENT_PAGES; page += 1) {
    const [result] = await Promise.allSettled([fetchIngredients({ page, size: INGREDIENT_PAGE_SIZE })]);
    if (result.status === "rejected") break;

    const response = result.value;
    entries.push(...response.items.map((ingredient) => entry(`/ingredients/${ingredient.id}`, "monthly", 0.7)));
    if (!response.pagination.hasNext) break;
  }

  return entries;
};

const escapeXml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export const sitemapXml = (entries: MetadataRoute.Sitemap): string => {
  const urls = entries
    .map(
      ({ url, changeFrequency, priority }) =>
        `<url><loc>${escapeXml(url)}</loc>${changeFrequency ? `<changefreq>${changeFrequency}</changefreq>` : ""}${priority === undefined ? "" : `<priority>${priority}</priority>`}</url>`,
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
