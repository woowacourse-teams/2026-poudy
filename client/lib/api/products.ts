import type {
  BrandDetailResponse,
  BrandOverviewResponse,
  CategoryListResponse,
  ExcludeCodeListResponse,
  IngredientDetailResponse,
  IngredientListResponse,
  IngredientPageResponse,
  ProductCountResponse,
  ProductDetailResponse,
  ProductPageResponse,
  ProductSuggestionPageResponse,
  StorageResponse,
} from "@poudy/api/api.zod";

import { apiGet } from "./client";

import type { Filter } from "@/lib/domain/filter";
import { serializeFilter } from "@/lib/domain/filter";

const INGREDIENT_PAGE_SIZE = 100;

/** 동적 목록 화면에서 사용하는 fetch 응답을 서버에 담아 두는 시간. */
const CATALOG_TTL = 12 * 60 * 60;

type IngredientItemsResponse = Pick<IngredientPageResponse, "items">;

export const fetchProducts = (filter: Filter): Promise<ProductPageResponse> =>
  apiGet("/api/products", serializeFilter(filter), CATALOG_TTL);

export const fetchProductCount = (filter: Filter): Promise<ProductCountResponse> =>
  apiGet("/api/products/count", serializeFilter(filter));

export const fetchProductDetail = (productId: number): Promise<ProductDetailResponse> =>
  apiGet(`/api/products/${productId}`);

export const fetchProductSuggestions = (keyword: string, page = 0): Promise<ProductSuggestionPageResponse> =>
  apiGet("/api/products/suggestions", new URLSearchParams({ keyword, page: String(page) }));

export const fetchIngredients = (query: {
  readonly ingredientIds?: readonly number[];
  readonly page?: number;
  readonly size?: number;
}): Promise<IngredientPageResponse> => {
  const params = new URLSearchParams();
  for (const id of query.ingredientIds ?? []) params.append("ingredientIds", String(id));
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  return apiGet("/api/ingredients", params);
};

/** ID 조건에 해당하는 성분을 마지막 페이지까지 조회해 하나의 목록으로 합친다. */
export const fetchIngredientsByIds = async (ingredientIds: readonly number[]): Promise<IngredientItemsResponse> => {
  if (ingredientIds.length === 0) return { items: [] };

  const items: IngredientPageResponse["items"] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const response = await fetchIngredients({ ingredientIds, page, size: INGREDIENT_PAGE_SIZE });
    items.push(...response.items);
    hasNext = response.pagination.hasNext;
    page += 1;
  }

  return { items };
};

export const fetchIngredientSuggestions = (keyword: string): Promise<IngredientListResponse> =>
  apiGet("/api/ingredients/suggestions", new URLSearchParams({ keyword }));

export const fetchIngredientDetail = (ingredientId: number): Promise<IngredientDetailResponse> =>
  apiGet(`/api/ingredients/${ingredientId}`);

export const fetchExcludeCodes = (): Promise<ExcludeCodeListResponse> =>
  apiGet("/api/exclude-codes", undefined, CATALOG_TTL);

export const fetchCategories = (): Promise<CategoryListResponse> => apiGet("/api/categories", undefined, CATALOG_TTL);

export const fetchBrands = (): Promise<BrandOverviewResponse> => apiGet("/api/brands", undefined, CATALOG_TTL);

export const fetchBrand = (brandId: number): Promise<BrandDetailResponse> =>
  apiGet(`/api/brands/${brandId}`, undefined, CATALOG_TTL);

/** 저장함은 브라우저가 가진 ID 로 표시 정보를 채운다. */
export const fetchStorage = (productIds: readonly number[]): Promise<StorageResponse> =>
  apiGet("/api/storage", new URLSearchParams(productIds.map((id) => ["productIds", String(id)])));
