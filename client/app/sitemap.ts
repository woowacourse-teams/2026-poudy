import type { MetadataRoute } from "next";

import { fetchBrands, fetchCategories, fetchIngredients, fetchProducts } from "@/lib/api/products";
import { EMPTY_FILTER } from "@/lib/domain/filter";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * sitemap 하나에 실을 수 있는 주소는 5 만 개까지다(sitemaps.org 규격).
 * 아래 페이지 상한은 색인 범위가 아니라 hasNext 가 끝나지 않을 때를 막는 안전장치다.
 * 여기에 걸리면 주소가 조용히 빠지므로 generateSitemaps 로 나누어 실어야 한다.
 */
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

const productEntries = async (): Promise<MetadataRoute.Sitemap> => {
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

const ingredientEntries = async (): Promise<MetadataRoute.Sitemap> => {
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
    entry("/", "weekly", 1),
    entry("/categories", "weekly", 0.8),
    entry("/brands", "weekly", 0.8),
  ];
  const [categories, brands, products, ingredients] = await Promise.allSettled([
    fetchCategories(),
    fetchBrands(),
    productEntries(),
    ingredientEntries(),
  ]);

  if (categories.status === "fulfilled") {
    fixed.push(
      ...categories.value.items
        .flatMap((category) => [category, ...category.children])
        .map(({ id }) => entry(`/categories/${id}`, "weekly", 0.7)),
    );
  }
  if (brands.status === "fulfilled") {
    fixed.push(...brands.value.items.map(({ id }) => entry(`/brands/${id}`, "weekly", 0.7)));
  }
  if (products.status === "fulfilled") fixed.push(...products.value);
  if (ingredients.status === "fulfilled") fixed.push(...ingredients.value);

  return fixed;
}
