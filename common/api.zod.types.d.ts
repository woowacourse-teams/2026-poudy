
  export namespace Schemas {
  export type BenefitResponse = { color: string, id: number, ingredientIds: Array<number>, name: string }
export type BrandResponse = { id: number, logoUrl: string, name: string, productCount: number }
export type BrandListResponse = { items: Array<BrandResponse> }
export type BrandSummaryResponse = { id: number, logoUrl: string, name: string }
export type CategoryChildResponse = { id: number, name: string, productCount: number }
export type CategoryResponse = { children: Array<CategoryChildResponse>, id: number, name: string, productCount: number }
export type CategoryListResponse = { items: Array<CategoryResponse> }
export type CategorySummaryResponse = { id: number, name: string }
export type EffectResponse = { color: string, id: number, name: string }
export type IngredientSummaryResponse = { englishName: string, id: number, koreanName: string }
export type IngredientDetailResponse = { description: string, effectSources: Array<string>, effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, infoSources: Array<string>, koreanName: string, productCount: number, relatedIngredients: Array<IngredientSummaryResponse>, updatedAt: string }
export type IngredientResponse = { effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, koreanName: string }
export type IngredientListResponse = { items: Array<IngredientResponse> }
export type PaginationResponse = { hasNext: boolean, page: number, size: number, totalElements: number, totalPages: number }
export type ProblemDetail = { code: ("INVALID_QUERY_PARAMETER" | "CONFLICTING_INGREDIENT_FILTER" | "UNSUPPORTED_REQUEST" | "PRODUCT_NOT_FOUND" | "BRAND_NOT_FOUND" | "INGREDIENT_NOT_FOUND" | "ENDPOINT_NOT_FOUND" | "INTERNAL_SERVER_ERROR"), detail: string, instance?: string, status: number, title: string, type?: string }
export type ProductCountResponse = { count: number }
export type ProductIngredientResponse = { effects: Array<EffectResponse>, englishName: string, id: number, koreanName: string }
export type ProductDetailResponse = { benefits: Array<BenefitResponse>, brand: BrandSummaryResponse, categories: Array<CategorySummaryResponse>, freeOfCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, imageUrl: string, ingredients: Array<ProductIngredientResponse>, moistureLevel: number, name: string, oilLevel: number, price: number, volumeUnit: string, volumeValue: number }
export type ProductResponse = { brand: BrandSummaryResponse, id: number, imageUrl: string, name: string, price: number, volumeUnit: string, volumeValue: number }
export type ProductPageResponse = { items: Array<ProductResponse>, pagination: PaginationResponse }

    }

  export namespace Endpoints {

  /**
 * 브랜드 목록을 조회하거나 브랜드명으로 검색한다. keyword 를 생략하면 전체를 브랜드명 오름차순으로 반환한다.
 */
export type get_FindBrands = {
      method: "GET",
      path: "/api/brands",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string }>,




          }
      responses: {200: Schemas.BrandListResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 브랜드 ID 에 해당하는 상세 정보를 조회한다. 브랜드에 속한 제품 목록은 제품 조회에서 brandIds 로 받는다.
 */
export type get_FindBrand = {
      method: "GET",
      path: "/api/brands/{brandId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { brandId: number },



          }
      responses: {200: Schemas.BrandResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
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
 * 성분 목록을 조회하거나 성분명으로 검색한다. keyword 를 생략하면 전체를 한글명 오름차순으로 반환한다.
 */
export type get_FindIngredients = {
      method: "GET",
      path: "/api/ingredients",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string }>,




          }
      responses: {200: Schemas.IngredientListResponse,
400: Schemas.ProblemDetail,
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

  }


     export type EndpointByMethod = {
     get: {
           "/api/brands": Endpoints.get_FindBrands,
"/api/brands/{brandId}": Endpoints.get_FindBrand,
"/api/categories": Endpoints.get_FindCategories,
"/api/ingredients": Endpoints.get_FindIngredients,
"/api/ingredients/{ingredientId}": Endpoints.get_FindIngredient,
"/api/products": Endpoints.get_FindProducts,
"/api/products/count": Endpoints.get_CountProducts,
"/api/products/detail/{productId}": Endpoints.get_FindProductDetail,
"/api/products/{productId}": Endpoints.get_FindProduct
         }
     }



    export type GetEndpoints = EndpointByMethod["get"]

