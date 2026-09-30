import {
  BrandDetailResponse,
  BrandOverviewResponse,
  CategoryListResponse,
  CurationDetailResponse,
  CurationListResponse,
  ExcludeCodeListResponse,
  IngredientDetailResponse,
  IngredientGroupResponse,
  IngredientListResponse,
  IngredientPageResponse,
  ProductCountResponse,
  ProductDetailResponse,
  ProductPageResponse,
  ProductRankingResponse,
  ProductSuggestionPageResponse,
  RankingsResponse,
  SkinTypesResponse,
  StorageResponse,
} from "@poudy/api/api.zod";

import { apiGet, apiPost } from "./client";

import type { Filter } from "@/lib/domain/filter";
import { FIRST_PAGE, serializeFilter } from "@/lib/domain/filter";

const INGREDIENT_PAGE_SIZE = 100;

/** 동적 목록 화면에서 사용하는 fetch 응답을 서버에 담아 두는 시간. */
const CATALOG_TTL = 12 * 60 * 60;

/**
 * 인기 제품을 집계할 기간(일). 한국 시간 기준으로 오늘을 포함해 셈한다.
 *
 * 한 주를 기준으로 삼으면 요일에 따른 차이가 고르게 섞인다. 기간을 주지 않으면
 * 서비스를 열었을 때부터 쌓인 조회수를 전부 더해 순위가 굳는다.
 */
const RANKING_DAYS = 7;

/** 홈에서 집계 데이터를 담아 두는 시간. 인기 검색어와 인기 제품을 10분 단위로 새로 받는다. */
const RANKING_TTL = 10 * 60;

type IngredientItemsResponse = Pick<IngredientPageResponse, "items">;

export const fetchProducts = (filter: Filter): Promise<ProductPageResponse> =>
  apiGet("/api/products", ProductPageResponse, { query: serializeFilter(filter), revalidate: CATALOG_TTL });

export const fetchProductCount = (filter: Filter): Promise<ProductCountResponse> =>
  apiGet("/api/products/count", ProductCountResponse, { query: serializeFilter(filter) });

export const fetchProductDetail = (productId: number, partId?: number): Promise<ProductDetailResponse> =>
  apiGet(`/api/products/${productId}`, ProductDetailResponse, { query: partQuery(partId) });

const partQuery = (partId: number | undefined) => {
  if (partId === undefined) return undefined;
  return new URLSearchParams({ partId: String(partId) });
};

export const recordProductView = (productId: number): Promise<void> => apiPost(`/api/products/${productId}/views`);

export const fetchProductSuggestions = (keyword: string, page = FIRST_PAGE): Promise<ProductSuggestionPageResponse> =>
  apiGet("/api/products/suggestions", ProductSuggestionPageResponse, {
    query: new URLSearchParams({ keyword, page: String(page) }),
  });

export const fetchIngredients = (query: {
  readonly ingredientIds?: readonly number[];
  readonly usedInProducts?: boolean;
  readonly page?: number;
  readonly size?: number;
}): Promise<IngredientPageResponse> => {
  const params = new URLSearchParams();
  for (const id of query.ingredientIds ?? []) params.append("ingredientIds", String(id));
  if (query.usedInProducts) params.set("usedInProducts", "true");
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  return apiGet("/api/ingredients", IngredientPageResponse, { query: params });
};

/** ID 조건에 해당하는 성분을 마지막 페이지까지 조회해 하나의 목록으로 합친다. */
export const fetchIngredientGroup = (code: string): Promise<IngredientGroupResponse> =>
  apiGet(`/api/ingredient-groups/${encodeURIComponent(code)}`, IngredientGroupResponse);

export const fetchIngredientsByIds = async (ingredientIds: readonly number[]): Promise<IngredientItemsResponse> => {
  if (ingredientIds.length === 0) return { items: [] };

  const items: IngredientPageResponse["items"] = [];
  let page = FIRST_PAGE;
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
  apiGet("/api/ingredients/suggestions", IngredientListResponse, { query: new URLSearchParams({ keyword }) });

export const fetchIngredientDetail = (ingredientId: number): Promise<IngredientDetailResponse> =>
  apiGet(`/api/ingredients/${ingredientId}`, IngredientDetailResponse);

export const fetchExcludeCodes = (): Promise<ExcludeCodeListResponse> =>
  apiGet("/api/exclude-codes", ExcludeCodeListResponse, { revalidate: CATALOG_TTL });

/**
 * 제품이 없는 카테고리는 눌러도 빈 목록만 나오므로 받은 자리에서 뺀다. 디렉터리, 홈 칩,
 * 상세의 형제 줄, 사이트맵이 모두 이 목록을 보므로 한 곳에서 거른다.
 */
export const fetchCategories = async (): Promise<CategoryListResponse> => {
  const response = await apiGet<CategoryListResponse>("/api/categories", CategoryListResponse, {
    revalidate: CATALOG_TTL,
  });

  return {
    items: response.items.flatMap((category) => {
      const children = category.children.filter((child) => child.productCount > 0);
      return category.productCount > 0 && children.length > 0 ? [{ ...category, children }] : [];
    }),
  };
};

export const fetchBrands = (): Promise<BrandOverviewResponse> =>
  apiGet("/api/brands", BrandOverviewResponse, { revalidate: CATALOG_TTL });

export const fetchBrand = (brandId: number): Promise<BrandDetailResponse> =>
  apiGet(`/api/brands/${brandId}`, BrandDetailResponse, { revalidate: CATALOG_TTL });

/** 저장함은 브라우저가 가진 ID 로 표시 정보를 채운다. */
export const fetchStorage = (productIds: readonly number[]): Promise<StorageResponse> =>
  apiGet("/api/storage", StorageResponse, {
    query: new URLSearchParams(productIds.map((id) => ["productIds", String(id)])),
  });

/*
 * 큐레이션은 기획자가 운영 중에 고치는 데이터라 서버에 담아 두지 않는다. 카탈로그처럼 12시간을
 * 담아 두면 여백이나 제품을 고쳐도 반나절 동안 예전 화면이 나간다.
 */
export const fetchCurations = (): Promise<CurationListResponse> => apiGet("/api/curations", CurationListResponse);

/** 큐레이션 상세. 이미지와 제품이 모두 blocks 에 담겨 한 번에 온다. */
export const fetchCuration = (curationId: number): Promise<CurationDetailResponse> =>
  apiGet(`/api/curations/${curationId}`, CurationDetailResponse);

export const fetchSkinTypes = (): Promise<SkinTypesResponse> =>
  apiGet("/api/skin-types", SkinTypesResponse, { revalidate: CATALOG_TTL });

/** 인기 검색어 순위. 실시간으로 보여 주는 값이라 짧게만 담아 둔다. */
export const fetchSearchKeywordRankings = (): Promise<RankingsResponse> =>
  apiGet("/api/search-keywords/rankings", RankingsResponse, { revalidate: RANKING_TTL });

/**
 * 조회수로 매긴 인기 제품. 카테고리를 주면 그 카테고리 안에서만 고른다.
 * 서버가 최대 여섯 개를 내려 준다.
 */
export const fetchProductRankings = (categoryIds: readonly number[] = []): Promise<ProductRankingResponse> => {
  const params = new URLSearchParams([["days", String(RANKING_DAYS)]]);
  for (const id of categoryIds) params.append("categoryIds", String(id));
  return apiGet("/api/products/rankings", ProductRankingResponse, { query: params, revalidate: RANKING_TTL });
};

/**
 * 검색어를 순위 집계에 남긴다. 실패해도 검색 자체는 계속되어야 하므로 부르는 쪽에서 삼킨다.
 * 자동완성을 위해 입력하는 도중의 값이 아니라, 검색이 실제로 수행된 말만 보낸다.
 */
export const recordSearchKeyword = (keyword: string): Promise<void> => apiPost("/api/search-keywords", { keyword });
