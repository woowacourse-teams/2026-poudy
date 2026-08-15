  export namespace Schemas {
  export type BrandResponse = {
  /**
   * 브랜드 ID
   */
  id: number;
  /**
   * 브랜드 한글명
   */
  name: string;
  /**
   * 브랜드 영문명
   */
  englishName: string;
  /**
   * 브랜드 이미지 URL
   */
  imageUrl: string;
}
export type ProductResponse = {
  /**
   * 제품 ID
   */
  id: number;
  /**
   * 제품명
   */
  name: string;
  brand: BrandResponse;
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
}
export type StorageResponse = {
  /**
   * 요청한 ID 순서대로 담긴 제품. 찾지 못한 ID 는 빠진다
   */
  items: Array<ProductResponse>;
}
export type PaginationResponse = { page: number, size: number, totalElements: number, totalPages: number, hasNext: boolean }
export type ProductPageResponse = {
  items: Array<ProductResponse>;
  pagination: PaginationResponse;
  /**
   * 조회 조건에 해당하는 제품 전체의 브랜드. 페이지에 걸리지 않고 결과 전체를 기준으로 한다
   */
  brands: Array<BrandResponse>;
}
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
export type DisclosedAmountResponse = {
  /**
   * 공개 형태
   */
  type: string;
  /**
   * 함량 값
   */
  value: number;
  /**
   * 함량 단위
   */
  unit: string;
}
export type FormulationRoleResponse = {
  /**
   * 배합 목적 ID
   */
  id: number;
  /**
   * 배합 목적 이름 (CosIng Function)
   */
  name: string;
}
export type ProductVariantResponse = {
  /**
   * 용량 옵션 ID
   */
  id: number;
  /**
   * 가격 (원)
   */
  price: number;
  /**
   * 용량 값
   */
  volumeValue: number;
  /**
   * 용량 단위
   */
  volumeUnit: string;
  /**
   * 판매 상태
   */
  status: string;
}
export type SkinEffectGroupResponse = {
  /**
   * 피부 작용 ID
   */
  id: number;
  /**
   * 피부 작용 이름
   */
  name: string;
  /**
   * 화면에서 이 피부 작용을 구분하는 색
   */
  color: string;
  ingredientIds: Array<number>;
}
export type SkinEffectResponse = {
  /**
   * 피부 작용 ID
   */
  id: number;
  /**
   * 피부 작용 이름
   */
  name: string;
}
export type ProductIngredientResponse = {
  id: number;
  koreanName: string;
  englishName: string;
  /**
   * 배합 목적 태그 (CosIng FUNCTION). 제형에서 이 성분이 맡는 역할이다. 예: 습윤제, 유화제, 보존제
   */
  formulationRoles: Array<FormulationRoleResponse>;
  /**
   * 피부 작용 태그 (BIOLOGICAL_EFFECT). 피부에 기대할 수 있는 작용이다. 예: 피부 장벽 관련, 미백 관련, 주름 관련
   */
  skinEffects: Array<SkinEffectResponse>;
  disclosedAmount?: DisclosedAmountResponse;
}
export type ProductDetailResponse = {
  /**
   * 제품 ID
   */
  id: number;
  /**
   * 제품명
   */
  name: string;
  brand: BrandResponse;
  /**
   * 제품 카테고리 목록
   */
  categories: Array<CategoryPathResponse>;
  /**
   * 제품 대표 이미지 URL
   */
  imageUrl: string;
  /**
   * 같은 제품의 용량 옵션 전체. 가격과 용량은 옵션마다 따로 있다
   */
  variants: Array<ProductVariantResponse>;
  /**
   * 수분감 단계 (0~3)
   */
  moistureLevel: number;
  /**
   * 유분감 단계 (0~3)
   */
  oilLevel: number;
  /**
   * 피부 작용별 성분 그룹
   */
  skinEffectGroups: Array<SkinEffectGroupResponse>;
  /**
   * 표시 순서대로 정렬된 전체 성분
   */
  ingredients: Array<ProductIngredientResponse>;
  /**
   * 이 제품이 포함하지 않는 성분군 (프리 뱃지)
   */
  freeOfCodes: Array<("FRAGRANCE_ALLERGENS" | "DRYING_ALCOHOLS" | "HARSH_PRESERVATIVES" | "SULFATES" | "CYCLIC_SILICONES" | "SYNTHETIC_COLORANTS")>;
  /**
   * 제품 정보를 마지막으로 갱신한 시각
   */
  updatedAt: string;
}
export type ProductSuggestionResponse = {
  /**
   * 제품 ID
   */
  id: number;
  /**
   * 제품명
   */
  name: string;
  /**
   * 제품 대표 이미지 URL
   */
  imageUrl: string;
  /**
   * 브랜드 한글명
   */
  brandName: string;
}
export type ProductSuggestionListResponse = {
  /**
   * 검색어에 해당하는 제품
   */
  items: Array<ProductSuggestionResponse>;
}
export type ProductCountResponse = { count: number }
export type IngredientResponse = {
  /**
   * 성분 ID
   */
  id: number;
  /**
   * 성분 한글명
   */
  koreanName: string;
  /**
   * 성분 영문명
   */
  englishName: string;
  /**
   * 피부 작용 태그 (BIOLOGICAL_EFFECT)
   */
  skinEffects: Array<SkinEffectResponse>;
}
export type IngredientListResponse = {
  /**
   * 검색어에 해당하는 성분
   */
  items: Array<IngredientResponse>;
}
export type IngredientDetailResponse = {
  id: number;
  koreanName: string;
  englishName: string;
  description: string;
  /**
   * 배합 목적 태그 (CosIng FUNCTION). 제형에서 이 성분이 맡는 역할이다. 예: 습윤제, 유화제, 보존제
   */
  formulationRoles: Array<FormulationRoleResponse>;
  /**
   * 피부 작용 태그 (BIOLOGICAL_EFFECT). 피부에 기대할 수 있는 작용이다. 예: 피부 장벽 관련, 미백 관련, 주름 관련
   */
  skinEffects: Array<SkinEffectResponse>;
  groupCodes: Array<("FRAGRANCE_ALLERGENS" | "DRYING_ALCOHOLS" | "HARSH_PRESERVATIVES" | "SULFATES" | "CYCLIC_SILICONES" | "SYNTHETIC_COLORANTS")>;
  /**
   * 이 성분을 포함한 제품 수
   */
  productCount: number;
  infoSources: Array<string>;
  effectSources: Array<string>;
  updatedAt: string;
}
export type IngredientSummaryResponse = { id: number, koreanName: string, englishName: string }
export type ExcludeCodeResponse = {
  /**
   * 성분군을 구분하는 값
   */
  code: ("FRAGRANCE_ALLERGENS" | "DRYING_ALCOHOLS" | "HARSH_PRESERVATIVES" | "SULFATES" | "CYCLIC_SILICONES" | "SYNTHETIC_COLORANTS");
  /**
   * 빠른 필터에 표시할 이름
   */
  name: string;
  /**
   * 이 성분군에 속한 성분. 성분군에 무엇이 속하는지 보여주는 데 쓴다
   */
  ingredients: Array<IngredientSummaryResponse>;
  /**
   * 성분군 설명
   */
  description: string;
}
export type ExcludeCodeListResponse = {
  /**
   * 빠른 필터에 쓰는 성분군 전체
   */
  items: Array<ExcludeCodeResponse>;
}
export type CategoryChildResponse = { id: number, name: string, productCount: number }
export type CategoryResponse = { id: number, name: string, children: Array<CategoryChildResponse>, productCount: number }
export type CategoryListResponse = { items: Array<CategoryResponse> }
export type BrandListItemResponse = {
  /**
   * 브랜드 ID
   */
  id: number;
  /**
   * 브랜드 한글명
   */
  name: string;
  /**
   * 브랜드 영문명
   */
  englishName: string;
  /**
   * 브랜드 이미지 URL
   */
  imageUrl: string;
  /**
   * 이 브랜드의 제품 수. 전체 카탈로그 기준이며 제품 조회 필터와 무관하다
   */
  productCount: number;
}
export type BrandListResponse = { items: Array<BrandListItemResponse> }
export type BrandDetailResponse = {
  /**
   * 브랜드 ID
   */
  id: number;
  /**
   * 브랜드 한글명
   */
  name: string;
  /**
   * 브랜드 영문명
   */
  englishName: string;
  /**
   * 브랜드 이미지 URL
   */
  imageUrl: string;
  /**
   * 이 브랜드 제품이 속한 카테고리를 대분류와 소분류로 표시한다. productCount 는 이 브랜드 안에서 센 값이다
   */
  categories: Array<CategoryResponse>;
}
export type ProblemDetail = { type?: string, title: string, status: number, detail: string, instance?: string, code: ("INVALID_QUERY_PARAMETER" | "CONFLICTING_INGREDIENT_FILTER" | "UNSUPPORTED_REQUEST" | "PRODUCT_NOT_FOUND" | "BRAND_NOT_FOUND" | "INGREDIENT_NOT_FOUND" | "ENDPOINT_NOT_FOUND" | "INTERNAL_SERVER_ERROR") }

    }

  export namespace Endpoints {

  /**
 * 보관함에 담긴 제품 ID 로 제품 목록 항목과 같은 정보를 한 번에 조회한다. 받은 ID 를 모두 채워 돌려주므로 페이지를 나누지 않는다. 보관함 자체는 브라우저가 들고 있으며 서버는 저장하지 않는다.
 */
export type get_FindStorageProducts = {
      method: "GET",
      path: "/api/storage",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query:  { productIds: Array<number> },

          }
      responses: {200: Schemas.StorageResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 검색어와 필터 조건에 해당하는 제품 목록을 조회한다. keyword 와 필터 조건은 함께 보낼 수 있고 서로 AND 로 결합한다. sort 와 페이지 조건도 함께 쓴다.
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
  includeIngredientIds: Array<number>;
  excludeIngredientIds: Array<number>;
  excludeCodes: Array<("FRAGRANCE_ALLERGENS" | "DRYING_ALCOHOLS" | "HARSH_PRESERVATIVES" | "SULFATES" | "CYCLIC_SILICONES" | "SYNTHETIC_COLORANTS")>;
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
500: Schemas.ProblemDetail,
},

    }
/**
 * 제품 ID 에 해당하는 제품의 상세 정보와 전체 성분을 조회한다.
 */
export type get_FindProductDetail = {
      method: "GET",
      path: "/api/products/{productId}",
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
 * 검색어에 해당하는 제품을 ID, 이름, 이미지와 브랜드 이름만 담아 조회한다.
 */
export type get_SuggestProducts = {
      method: "GET",
      path: "/api/products/suggestions",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query:  {
  /**
   * 검색어
   */
  keyword: string;
},

          }
      responses: {200: Schemas.ProductSuggestionListResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 검색어와 필터 조건에 해당하는 제품 개수를 조회한다. 목록과 같은 조건을 같은 규칙으로 받는다.
 */
export type get_CountProducts = {
      method: "GET",
      path: "/api/products/count",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string, categoryIds: Array<number>, brandIds: Array<number>, moistureLevel: Array<number>, oilLevel: Array<number>, includeIngredientIds: Array<number>, excludeIngredientIds: Array<number>, excludeCodes: Array<("FRAGRANCE_ALLERGENS" | "DRYING_ALCOHOLS" | "HARSH_PRESERVATIVES" | "SULFATES" | "CYCLIC_SILICONES" | "SYNTHETIC_COLORANTS")> }>,

          }
      responses: {200: Schemas.ProductCountResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 검색어에 해당하는 성분을 ID, 이름과 피부 작용 태그만 담아 조회한다.
 */
export type get_FindIngredients = {
      method: "GET",
      path: "/api/ingredients",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query:  {
  /**
   * 검색어
   */
  keyword: string;
},

          }
      responses: {200: Schemas.IngredientListResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 성분 ID 에 해당하는 설명, 출처와 이 성분을 포함한 제품 수까지 조회한다.
 */
export type get_FindIngredientDetail = {
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
 * 빠른 필터에 쓰는 성분군 전체와 각 성분군에 속한 성분을 조회한다. 제품 조회에는 고른 성분군의 code 를 excludeCodes 로 보낸다. ingredients 는 성분군에 무엇이 속하는지 보여주는 데 쓴다.
 */
export type get_FindExcludeCodes = {
      method: "GET",
      path: "/api/exclude-codes",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.ExcludeCodeListResponse,
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
500: Schemas.ProblemDetail,
},

    }
/**
 * 전체 브랜드를 브랜드명 오름차순으로 조회하고 브랜드마다 제품 수를 함께 싣는다.
 */
export type get_FindBrands = {
      method: "GET",
      path: "/api/brands",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.BrandListResponse,
500: Schemas.ProblemDetail,
},

    }
/**
 * 브랜드 ID 에 해당하는 정보와 이 브랜드 제품이 속한 카테고리를 조회한다. 브랜드에 속한 제품은 제품 조회에서 brandIds 로 받는다.
 */
export type get_FindBrand = {
      method: "GET",
      path: "/api/brands/{brandId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { brandId: number },

          }
      responses: {200: Schemas.BrandDetailResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }

  }

     export type EndpointByMethod = {
     get: {
           "/api/storage": Endpoints.get_FindStorageProducts,
"/api/products": Endpoints.get_FindProducts,
"/api/products/{productId}": Endpoints.get_FindProductDetail,
"/api/products/suggestions": Endpoints.get_SuggestProducts,
"/api/products/count": Endpoints.get_CountProducts,
"/api/ingredients": Endpoints.get_FindIngredients,
"/api/ingredients/{ingredientId}": Endpoints.get_FindIngredientDetail,
"/api/exclude-codes": Endpoints.get_FindExcludeCodes,
"/api/categories": Endpoints.get_FindCategories,
"/api/brands": Endpoints.get_FindBrands,
"/api/brands/{brandId}": Endpoints.get_FindBrand
         }
     }

    export type GetEndpoints = EndpointByMethod["get"]
