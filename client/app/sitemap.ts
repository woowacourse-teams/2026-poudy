import type { MetadataRoute } from "next";

import { fetchBrands, fetchCategories, fetchIngredients, fetchProducts } from "@/lib/api/products";
import { EMPTY_FILTER } from "@/lib/domain/filter";
import { absoluteUrl } from "@/lib/seo/site";

const PRODUCT_PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = 10;
const INGREDIENT_BATCH_SIZE = 100;
const MAX_INGREDIENT_BATCHES = 100;
const INGREDIENT_BATCH_CONCURRENCY = 5;

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
  const batches = Array.from({ length: MAX_INGREDIENT_BATCHES }, (_, batch) =>
    Array.from({ length: INGREDIENT_BATCH_SIZE }, (_, offset) => batch * INGREDIENT_BATCH_SIZE + offset + 1),
  );
  const entries: MetadataRoute.Sitemap = [];

  for (let index = 0; index < batches.length; index += INGREDIENT_BATCH_CONCURRENCY) {
    const responses = await Promise.allSettled(
      batches
        .slice(index, index + INGREDIENT_BATCH_CONCURRENCY)
        .map((ingredientIds) => fetchIngredients({ ingredientIds, size: INGREDIENT_BATCH_SIZE })),
    );

    entries.push(
      ...responses.flatMap((response) =>
        response.status === "fulfilled"
          ? response.value.items.map((ingredient) => entry(`/ingredients/${ingredient.id}`, "monthly", 0.7))
          : [],
      ),
    );
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
