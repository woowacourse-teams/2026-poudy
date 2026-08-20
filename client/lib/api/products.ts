import type {
  BrandDetailResponse,
  BrandListResponse,
  CategoryListResponse,
  ExcludeCodeListResponse,
  IngredientDetailResponse,
  IngredientListResponse,
  ProductCountResponse,
  ProductDetailResponse,
  ProductPageResponse,
  ProductSuggestionListResponse,
  StorageResponse,
} from "@poudy/api/api.zod";

import { apiGet } from "./client";

import type { Filter } from "@/lib/domain/filter";
import { serializeFilter } from "@/lib/domain/filter";

export const fetchProducts = (filter: Filter): Promise<ProductPageResponse> =>
  apiGet("/api/products", serializeFilter(filter));

export const fetchProductCount = (filter: Filter): Promise<ProductCountResponse> =>
  apiGet("/api/products/count", serializeFilter(filter));

export const fetchProductDetail = (productId: number): Promise<ProductDetailResponse> =>
  apiGet(`/api/products/${productId}`);

export const fetchProductSuggestions = (keyword: string): Promise<ProductSuggestionListResponse> =>
  apiGet("/api/products/suggestions", new URLSearchParams({ keyword }));

/**
 * 검색어나 성분 ID 로 조회한다. 둘을 함께 보내면 모두 만족하는 성분만 돌려준다.
 * ID 로만 조회하면 요청한 순서를 지킨다.
 */
export const fetchIngredients = (query: {
  readonly keyword?: string;
  readonly ingredientIds?: readonly number[];
}): Promise<IngredientListResponse> => {
  const params = new URLSearchParams();
  if (query.keyword) params.set("keyword", query.keyword);
  for (const id of query.ingredientIds ?? []) params.append("ingredientIds", String(id));
  return apiGet("/api/ingredients", params);
};

export const fetchIngredientDetail = (ingredientId: number): Promise<IngredientDetailResponse> =>
  apiGet(`/api/ingredients/${ingredientId}`);

export const fetchExcludeCodes = (): Promise<ExcludeCodeListResponse> => apiGet("/api/exclude-codes");

export const fetchCategories = (): Promise<CategoryListResponse> => apiGet("/api/categories");

export const fetchBrands = (): Promise<BrandListResponse> => apiGet("/api/brands");

export const fetchBrand = (brandId: number): Promise<BrandDetailResponse> => apiGet(`/api/brands/${brandId}`);

/** 저장함은 브라우저가 가진 ID 로 표시 정보를 채운다. */
export const fetchStorage = (productIds: readonly number[]): Promise<StorageResponse> =>
  apiGet("/api/storage", new URLSearchParams(productIds.map((id) => ["productIds", String(id)])));
