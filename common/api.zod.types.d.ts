  export namespace Schemas {
  export type BrandSummaryResponse = { id: number, name: string, logoUrl: string }
export type PaginationResponse = { page: number, size: number, totalElements: number, totalPages: number, hasNext: boolean }
export type ProductResponse = { id: number, name: string, brand: BrandSummaryResponse, imageUrl: string, price: number, volumeValue: number, volumeUnit: string }
export type ProductPageResponse = { items: Array<ProductResponse>, pagination: PaginationResponse }
export type BenefitResponse = { id: number, name: string, color: string, ingredientIds: Array<number> }
export type CategorySummaryResponse = { id: number, name: string }
export type CategoryPathResponse = {
  /**
   * 대분류 ID
   */
  id: number;
  /**
   * 대분류 이름
   */
  name: string;
  child?: CategorySummaryResponse;
}
export type EffectResponse = { id: number, name: string, color: string }
export type ProductIngredientResponse = { id: number, koreanName: string, englishName: string, effects: Array<EffectResponse> }
export type ProductDetailResponse = {
  /**
   * 제품 ID
   */
  id: number;
  /**
   * 제품명
   */
  name: string;
  brand: BrandSummaryResponse;
  /**
   * 제품 카테고리 목록
   */
  categories: Array<CategoryPathResponse>;
  /**
   * 제품 대표 이미지 URL
   */
  imageUrl: string;
  /**
   * 제품 가격 (원)
   */
  price: number;
  /**
   * 제품 용량 값
   */
  volumeValue: number;
  /**
   * 제품 용량 단위
   */
  volumeUnit: string;
  /**
   * 수분감 단계 (0~3)
   */
  moistureLevel: number;
  /**
   * 유분감 단계 (0~3)
   */
  oilLevel: number;
  /**
   * 효과별 성분 그룹
   */
  benefits: Array<BenefitResponse>;
  /**
   * 표시 순서대로 정렬된 전체 성분
   */
  ingredients: Array<ProductIngredientResponse>;
  /**
   * 이 제품이 포함하지 않는 성분군 (프리 뱃지)
   */
  freeOfCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>;
}
export type ProductCountResponse = { count: number }
export type IngredientSummaryResponse = { id: number, koreanName: string, englishName: string }
export type IngredientDetailResponse = { id: number, koreanName: string, englishName: string, description: string, effects: Array<EffectResponse>, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, productCount: number, infoSources: Array<string>, effectSources: Array<string>, relatedIngredients: Array<IngredientSummaryResponse>, updatedAt: string }
export type IngredientSuggestionResponse = {
  /**
   * 자동완성 후보. 최대 10건
   */
  items: Array<IngredientSummaryResponse>;
}
export type CategoryChildResponse = { id: number, name: string, productCount: number }
export type CategoryResponse = { id: number, name: string, children: Array<CategoryChildResponse>, productCount: number }
export type CategoryListResponse = { items: Array<CategoryResponse> }
export type BrandResponse = { id: number, name: string, logoUrl: string, productCount: number }
export type BrandListResponse = { items: Array<BrandResponse> }
export type ProblemDetail = { type?: string, title: string, status: number, detail: string, instance?: string, code: ("INVALID_QUERY_PARAMETER" | "CONFLICTING_INGREDIENT_FILTER" | "UNSUPPORTED_REQUEST" | "PRODUCT_NOT_FOUND" | "INGREDIENT_NOT_FOUND" | "ENDPOINT_NOT_FOUND" | "INTERNAL_SERVER_ERROR") }

    }

  export namespace Endpoints {

  /**
 * 검색어와 필터 조건에 해당하는 제품 목록을 조회한다.
 */
export type get_FindProducts = {
      method: "GET",
      path: "/api/products",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{
  keyword: string;
  categoryIds: Array<number>;
  brandIds: Array<number>;
  moistureLevel: Array<number>;
  oilLevel: Array<number>;
  excludeCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>;
  includeIngredientIds: Array<number>;
  excludeIngredientIds: Array<number>;
  /**
   * 정렬 조건
   */
  sort: ("NAME_ASC" | "NAME_DESC" | "PRICE_ASC" | "PRICE_DESC");
  /**
   * 조회할 페이지 번호 (0부터 시작)
   */
  page: number;
  /**
   * 페이지당 항목 개수
   */
  size: number;
}>,

          }
      responses: {200: Schemas.ProductPageResponse,
400: Schemas.ProblemDetail,
409: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 제품 ID 에 해당하는 기본 정보를 조회한다. 제품 목록 항목과 같은 형태다.
 */
export type get_FindProduct = {
      method: "GET",
      path: "/api/products/{productId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { productId: number },

          }
      responses: {200: Schemas.ProductResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 제품 ID 에 해당하는 제품의 상세 정보와 전체 성분을 조회한다.
 */
export type get_FindProductDetail = {
      method: "GET",
      path: "/api/products/detail/{productId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { productId: number },

          }
      responses: {200: Schemas.ProductDetailResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 필터 조건에 해당하는 제품 개수를 조회한다. 목록과 같은 판정 규칙을 쓴다.
 */
export type get_CountProducts = {
      method: "GET",
      path: "/api/products/count",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string, categoryIds: Array<number>, brandIds: Array<number>, moistureLevel: Array<number>, oilLevel: Array<number>, excludeCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, includeIngredientIds: Array<number>, excludeIngredientIds: Array<number> }>,

          }
      responses: {200: Schemas.ProductCountResponse,
400: Schemas.ProblemDetail,
409: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 성분 ID 에 해당하는 상세 정보를 조회한다.
 */
export type get_FindIngredient = {
      method: "GET",
      path: "/api/ingredients/{ingredientId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { ingredientId: number },

          }
      responses: {200: Schemas.IngredientDetailResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 검색어에 해당하는 성분 이름을 최대 10건 반환한다. 검색 입력 중 호출한다.
 */
export type get_SuggestIngredients = {
      method: "GET",
      path: "/api/ingredients/suggestions",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query:  { keyword: string },

          }
      responses: {200: Schemas.IngredientSuggestionResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 제품 필터에서 사용하는 전체 카테고리를 계층 구조로 조회한다.
 */
export type get_FindCategories = {
      method: "GET",
      path: "/api/categories",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.CategoryListResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 전체 브랜드를 브랜드명 오름차순으로 조회한다.
 */
export type get_FindBrands = {
      method: "GET",
      path: "/api/brands",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.BrandListResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }

  }

     export type EndpointByMethod = {
     get: {
           "/api/products": Endpoints.get_FindProducts,
"/api/products/{productId}": Endpoints.get_FindProduct,
"/api/products/detail/{productId}": Endpoints.get_FindProductDetail,
"/api/products/count": Endpoints.get_CountProducts,
"/api/ingredients/{ingredientId}": Endpoints.get_FindIngredient,
"/api/ingredients/suggestions": Endpoints.get_SuggestIngredients,
"/api/categories": Endpoints.get_FindCategories,
"/api/brands": Endpoints.get_FindBrands
         }
     }

    export type GetEndpoints = EndpointByMethod["get"]
