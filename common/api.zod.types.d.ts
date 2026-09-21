  export namespace Schemas {
  export type SearchKeywordRequest = { keyword: string }
export type ProductCorrectionRequest = { content: string, imageIds?: (Array<string> | null) }
export type ProductRegistrationRequest = {
  /**
   * 등록을 요청할 제품명
   */
  productName: string;
  /**
   * 브랜드명. 알 수 없으면 생략한다.
   */
  brandName?: (string | null);
}
export type FeedbackImageUploadResponse = {
  /**
   * 요청한 이미지 순서의 일회성 ID
   */
  imageIds: Array<string>;
}
export type FeedbackRequest = {
  /**
   * 의견 유형
   */
  type: ("BUG_REPORT" | "IMPROVEMENT" | "OTHER");
  content: string;
  /**
   * 의견을 작성한 화면 경로
   */
  path?: (string | null);
  /**
   * 미리 업로드한 선택적 이미지 ID 목록
   */
  imageIds?: (Array<string> | null);
}
export type AdminLoginRequest = {
  /**
   * 관리자 아이디
   */
  username: string;
  /**
   * 관리자 비밀번호
   */
  password: string;
}
export type AdminProductRequestStatusUpdateRequest = { status: ("RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED") }
export type AdminProductRequestResponse = { requestId: string, productName: string, brandName: (string | null), requestedAt: string, status: ("RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"), statusChangedAt: string, completedAt: (string | null) }
export type AdminFeedbackStatusUpdateRequest = { status: ("RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED") }
export type AdminFeedbackImageResponse = { imageId: string, extension: string }
export type AdminFeedbackResponse = { feedbackId: string, type: ("BUG_REPORT" | "IMPROVEMENT" | "OTHER" | "PRODUCT_CORRECTION"), content: string, path: (string | null), productId: (number | null), productName: (string | null), receivedAt: string, status: ("RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"), statusChangedAt: string, completedAt: (string | null), images: Array<AdminFeedbackImageResponse> }
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
  englishName: (string | null);
  /**
   * 브랜드 이미지 URL
   */
  imageUrl: (string | null);
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
export type SkinTypeResponse = {
  /**
   * 피부타입 코드
   */
  code: ("DRY" | "OILY" | "SENSITIVE" | "COMBINATION");
  /**
   * 피부타입 표시명
   */
  name: string;
}
export type SkinTypesResponse = {
  /**
   * 표시 순서대로 정렬된 피부타입 전체
   */
  items: Array<SkinTypeResponse>;
}
export type RankingChangeItem = { movement: string, steps: number }
export type RankingItem = { rank: number, keyword: string, change?: RankingChangeItem }
export type RankingsResponse = { items: Array<RankingItem> }
export type CategoryChildResponse = { id: number, name: string, productCount: number }
export type CategoryResponse = { id: number, name: string, children: Array<CategoryChildResponse>, productCount: number }
export type PaginationResponse = { page: number, size: number, totalElements: number, totalPages: number, hasNext: boolean }
export type ProductFilterOptionsResponse = {
  /**
   * 브랜드 조건 전체만 제외한 전체 일치 제품의 브랜드
   */
  brands: Array<BrandResponse>;
  /**
   * 카테고리 조건 전체만 제외한 전체 일치 제품의 카테고리와 제품 수
   */
  categories: Array<CategoryResponse>;
  /**
   * 피부 타입 조건만 제외한 전체 일치 제품의 피부 타입
   */
  skinTypes: Array<SkinTypeResponse>;
}
export type ProductPageResponse = {
  items: Array<ProductResponse>;
  pagination: PaginationResponse;
  /**
   * 조회 조건에 해당하는 제품 전체의 브랜드. 페이지에 걸리지 않고 결과 전체를 기준으로 한다
   */
  brands: Array<BrandResponse>;
  /**
   * 조회 조건에 해당하는 제품 전체의 카테고리와 제품 수. 페이지에 걸리지 않고 결과 전체를 기준으로 한다
   */
  categories: Array<CategoryResponse>;
  /**
   * 조회 조건에 해당하는 제품 전체의 피부타입. 페이지에 걸리지 않고 결과 전체를 기준으로 한다
   */
  skinTypes: Array<SkinTypeResponse>;
  filterOptions?: ProductFilterOptionsResponse;
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
  child: CategorySummaryResponse;
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
  code: string;
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
  code: string;
  /**
   * 피부 작용 이름
   */
  name: string;
  ingredientIds: Array<number>;
}
export type SkinEffectResponse = {
  /**
   * 피부 작용 ID
   */
  id: number;
  code: string;
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
   * 연관 성분 수가 많은 순서의 주요 피부 작용별 성분 그룹 (최대 3개)
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
export type ProductSuggestionMatchResponse = {
  /**
   * 검색어가 일치한 제품 필드
   */
  field: ("PRODUCT_NAME" | "BRAND_NAME");
  /**
   * 검색어가 일치한 원문
   */
  text: string;
  /**
   * 일치 구간의 UTF-16 시작 인덱스
   */
  startIndex: number;
  /**
   * 일치 구간의 UTF-16 종료 제외 인덱스
   */
  endIndexExclusive: number;
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
  match: ProductSuggestionMatchResponse;
}
export type ProductSuggestionPageResponse = {
  /**
   * 제품명 또는 브랜드명 검색어에 해당하는 제품
   */
  items: Array<ProductSuggestionResponse>;
  pagination: PaginationResponse;
}
export type ShareMatchResponse = { status: ("MATCHED" | "NOT_FOUND"), productId?: (number | null), keyword?: (string | null) }
export type ProductRankingProductResponse = {
  /**
   * 제품 ID
   */
  id: number;
  /**
   * 제품명
   */
  name: string;
  /**
   * 브랜드명
   */
  brandName: string;
  /**
   * 제품 대표 이미지 URL
   */
  imageUrl: string;
  /**
   * 대표 판매 옵션 가격 (원)
   */
  price: number;
  /**
   * 수분감 단계 (0~3)
   */
  moistureLevel: number;
  /**
   * 유분감 단계 (0~3)
   */
  oilLevel: number;
}
export type ProductRankingItemResponse = { product: ProductRankingProductResponse }
export type ProductRankingResponse = { items: Array<ProductRankingItemResponse> }
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
export type IngredientPageResponse = {
  /**
   * 조회된 성분
   */
  items: Array<IngredientResponse>;
  pagination: PaginationResponse;
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
export type IngredientSuggestionMatchResponse = {
  /**
   * 검색어가 일치한 성분 필드
   */
  field: ("KOREAN_NAME" | "ENGLISH_NAME" | "ALIAS");
  /**
   * 검색어가 일치한 원문
   */
  text: string;
  /**
   * 일치 구간의 UTF-16 시작 인덱스
   */
  startIndex: number;
  /**
   * 일치 구간의 UTF-16 종료 제외 인덱스
   */
  endIndexExclusive: number;
}
export type IngredientSuggestionResponse = {
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
  match: IngredientSuggestionMatchResponse;
}
export type IngredientListResponse = {
  /**
   * 검색어에 일치한 성분
   */
  items: Array<IngredientSuggestionResponse>;
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
   * 성분군 설명
   */
  description: string;
  /**
   * 이 성분군에 속한 성분. 성분군에 무엇이 속하는지 보여주는 데 쓴다
   */
  ingredients: Array<IngredientSummaryResponse>;
}
export type ExcludeCodeListResponse = {
  /**
   * 빠른 필터에 쓰는 성분군 전체
   */
  items: Array<ExcludeCodeResponse>;
}
export type CurationSummaryResponse = {
  /**
   * 큐레이션 ID
   */
  id: number;
  /**
   * 큐레이션 제목
   */
  title: string;
  /**
   * 큐레이션 설명
   */
  description: string;
  /**
   * 상세 이미지와 독립적인 배너 썸네일 URL
   */
  thumbnailImageUrl: string;
}
export type CurationListResponse = { items: Array<CurationSummaryResponse> }
export type CurationImageBlockResponse = {
  id: string;
  type: "IMAGE";
  /**
   * 위 여백 (px)
   */
  spacingTop: number;
  /**
   * 아래 여백 (px)
   */
  spacingBottom: number;
  imageUrl: string;
}
export type CurationProductResponse = {
  /**
   * 제품 ID
   */
  id: number;
  /**
   * 제품명
   */
  name: string;
  /**
   * 브랜드명
   */
  brandName: string;
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
export type CurationProductsBlockResponse = {
  id: string;
  type: "PRODUCTS";
  /**
   * 위 여백 (px)
   */
  spacingTop: number;
  /**
   * 아래 여백 (px)
   */
  spacingBottom: number;
  products: Array<CurationProductResponse>;
}
export type CurationFilterResponse = { id: string, label: string }
export type CurationProductItemResponse = {
  product: CurationProductResponse;
  /**
   * 제품이 속한 블록 내 필터 ID. 하나 이상
   */
  filterIds: Array<string>;
}
export type CurationProductsByFilterBlockResponse = {
  id: string;
  type: "PRODUCTS_BY_FILTER";
  /**
   * 위 여백 (px)
   */
  spacingTop: number;
  /**
   * 아래 여백 (px)
   */
  spacingBottom: number;
  filters: Array<CurationFilterResponse>;
  products: Array<CurationProductItemResponse>;
}
export type CurationBlockResponse = (CurationImageBlockResponse | CurationProductsBlockResponse | CurationProductsByFilterBlockResponse)
export type CurationDetailResponse = {
  /**
   * 큐레이션 ID
   */
  id: number;
  /**
   * 큐레이션 제목
   */
  title: string;
  /**
   * 큐레이션 설명
   */
  description: string;
  /**
   * 노출 가능한 블록 목록. 저장 순서를 유지하며 빈 배열일 수 있다.
   */
  blocks: Array<CurationBlockResponse>;
}
export type CategoryListResponse = { items: Array<CategoryResponse> }
export type BrandSummaryResponse = {
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
  englishName: (string | null);
  /**
   * 브랜드 이미지 URL
   */
  imageUrl: (string | null);
  /**
   * 이 브랜드의 제품 수. 전체 카탈로그 기준이며 제품 조회 필터와 무관하다
   */
  productCount: number;
}
export type BrandOverviewResponse = { items: Array<BrandSummaryResponse> }
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
  englishName: (string | null);
  /**
   * 브랜드 이미지 URL
   */
  imageUrl: (string | null);
  /**
   * 이 브랜드 제품이 속한 카테고리를 대분류와 소분류로 표시한다. productCount 는 이 브랜드 안에서 센 값이다
   */
  categories: Array<CategoryResponse>;
}
export type AdminProductRequestPageResponse = { items: Array<AdminProductRequestResponse>, pagination: PaginationResponse }
export type AdminFeedbackPageResponse = { items: Array<AdminFeedbackResponse>, pagination: PaginationResponse }
export type ProblemDetail = { type?: string, title: string, status: number, detail: string, instance?: string, code: ("INVALID_QUERY_PARAMETER" | "INVALID_REQUEST_BODY" | "INVALID_FEEDBACK_IMAGE" | "INVALID_FEEDBACK_IMAGE_ID" | "CONFLICTING_INGREDIENT_FILTER" | "PAYLOAD_TOO_LARGE" | "TOO_MANY_REQUESTS" | "UNSUPPORTED_REQUEST" | "FEEDBACK_NOT_FOUND" | "PRODUCT_REQUEST_NOT_FOUND" | "CURATION_NOT_FOUND" | "PRODUCT_NOT_FOUND" | "BRAND_NOT_FOUND" | "INGREDIENT_NOT_FOUND" | "ENDPOINT_NOT_FOUND" | "INTERNAL_SERVER_ERROR") }

    }

  export namespace Endpoints {

  /**
 * 제출한 검색어를 인기 검색어 집계에 더한다. 지금 상품이 검색되지 않는 검색어는 세지 않는다.
 */
export type post_Record = {
      method: "POST",
      path: "/api/search-keywords",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        body:  Schemas.SearchKeywordRequest,
          }
      responses: {204: unknown,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 존재하는 제품의 조회수를 요청마다 1회 증가시킨다. 인증이나 방문자 중복 제거 없이 새로고침과 재방문도 집계한다. 상세·목록 GET은 조회수를 증가시키지 않는다.
 */
export type post_IncreaseViewCount = {
      method: "POST",
      path: "/api/products/{productId}/views",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { productId: number },

          }
      responses: {204: unknown,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 존재하는 제품의 정보 정정 요청을 S3에 저장하고 Discord로 알린다.
 */
export type post_SubmitProductCorrection = {
      method: "POST",
      path: "/api/products/{productId}/correction-requests",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { productId: number },

        body:  Schemas.ProductCorrectionRequest,
          }
      responses: {204: unknown,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
429: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 검증한 제품 등록 요청을 운영 검토 대상으로 보관한다. 제품 등록 완료를 뜻하지 않는다.
 */
export type post_Submit = {
      method: "POST",
      path: "/api/products/registration-requests",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        body:  Schemas.ProductRegistrationRequest,
          }
      responses: {202: unknown,
400: Schemas.ProblemDetail,
429: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * JPEG, PNG, HEIC 이미지를 검증·재인코딩해 24시간 동안 임시 저장한다. HEIC는 JPEG로 저장한다.
 */
export type post_UploadImages = {
      method: "POST",
      path: "/api/pending-images",
      requestFormat: "form-data",
      responseFormat: "json",
      parameters: {

        body:  { images: Array<Blob> },
          }
      responses: {201: Schemas.FeedbackImageUploadResponse,
400: Schemas.ProblemDetail,
413: Schemas.ProblemDetail,
429: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 의견과 작성 화면 경로를 S3에 저장하고 Discord로 알린다.
 */
export type post_Submit_1 = {
      method: "POST",
      path: "/api/feedbacks",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        body:  Schemas.FeedbackRequest,
          }
      responses: {204: unknown,
400: Schemas.ProblemDetail,
429: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 관리자 계정을 확인한다.
 */
export type post_Login = {
      method: "POST",
      path: "/api/admin/login",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        body:  Schemas.AdminLoginRequest,
          }
      responses: {200: unknown,
400: Schemas.ProblemDetail,
401: unknown,
500: Schemas.ProblemDetail,
},

    }
export type patch_ChangeStatus = {
      method: "PATCH",
      path: "/api/admin/product-requests/{requestId}/status",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { requestId: string },

        body:  Schemas.AdminProductRequestStatusUpdateRequest,
          }
      responses: {200: Schemas.AdminProductRequestResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
export type patch_ChangeStatus_1 = {
      method: "PATCH",
      path: "/api/admin/feedbacks/{feedbackId}/status",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { feedbackId: string },

        body:  Schemas.AdminFeedbackStatusUpdateRequest,
          }
      responses: {200: Schemas.AdminFeedbackResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
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
 * 피부타입 코드와 표시명을 건성, 지성, 민감성, 복합성 순서로 조회한다.
 */
export type get_FindSkinTypes = {
      method: "GET",
      path: "/api/skin-types",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.SkinTypesResponse,
500: Schemas.ProblemDetail,
},

    }
/**
 * 공개 가능한 완성 검색어를 최대 10개 반환한다. 횟수는 공개하지 않는다.
 */
export type get_Rankings = {
      method: "GET",
      path: "/api/search-keywords/rankings",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.RankingsResponse,
500: Schemas.ProblemDetail,
},

    }
/**
 * 제품명 또는 브랜드명 검색어와 필터 조건에 해당하는 제품 목록을 조회한다. keyword 와 필터 조건은 함께 보낼 수 있고 서로 AND 로 결합한다. sort 와 페이지 조건도 함께 쓴다.
 */
export type get_FindProducts = {
      method: "GET",
      path: "/api/products",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{
  /**
   * 제품명 또는 브랜드명 검색어
   */
  keyword: string;
  categoryIds: Array<number>;
  brandIds: Array<number>;
  moistureLevel: Array<number>;
  oilLevel: Array<number>;
  includeIngredientIds: Array<number>;
  excludeIngredientIds: Array<number>;
  excludeCodes: Array<("FRAGRANCE_ALLERGENS" | "DRYING_ALCOHOLS" | "HARSH_PRESERVATIVES" | "SULFATES" | "CYCLIC_SILICONES" | "SYNTHETIC_COLORANTS")>;
  /**
   * 선택적인 단일 피부타입. 기존 필터와 AND로 결합한다. 빈 값은 미지정으로 처리하고 반복 전달 시 첫 값을 사용한다
   */
  skinType: ("DRY" | "OILY" | "SENSITIVE" | "COMBINATION");
  /**
   * 정렬 조건
   */
  sort: ("NAME_ASC" | "NAME_DESC" | "PRICE_ASC" | "PRICE_DESC");
  /**
   * 조회할 페이지 번호 (1부터 시작)
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
 * 제품명 또는 브랜드명 검색어에 해당하는 제품을 ID, 이름, 이미지와 브랜드 이름만 담아 페이지 단위로 조회한다. match 는 제품명 또는 브랜드명 중 실제로 일치한 원문과 그 원문을 기준으로 한 UTF-16 반열림 구간을 제공한다. pagination.totalElements 는 페이지가 아니라 검색어에 해당하는 제품 전체를 센 값이다.
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
  /**
   * 조회할 페이지 번호 (1부터 시작)
   */
  page?: number;
  /**
   * 페이지당 항목 개수
   */
  size?: number;
},

          }
      responses: {200: Schemas.ProductSuggestionPageResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 올리브영 공유 텍스트 원문을 가공 없이 받아 제품 하나로 확정한다. MATCHED 면 productId 를, NOT_FOUND 면 검색으로 이어 갈 keyword 를 싣는다. 링크가 없거나 정제 후 제품명이 남지 않으면 거절한다.
 */
export type get_MatchSharedProduct = {
      method: "GET",
      path: "/api/products/share-matches",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query:  { text: string },

          }
      responses: {200: Schemas.ShareMatchResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 현재 카탈로그에서 카테고리에 해당하는 제품을 먼저 고른 뒤 한국 시간 날짜별 조회수를 합산해 내림차순으로 최대 6개 반환한다. 조회수가 같으면 기본 제품 순서를 유지한다.
 */
export type get_FindRankings = {
      method: "GET",
      path: "/api/products/rankings",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{
  categoryIds: Array<number>;
  /**
   * 한국 시간 기준 오늘을 포함해 집계할 날짜 수. 미지정 시 전체 기간
   */
  days: number;
}>,

          }
      responses: {200: Schemas.ProductRankingResponse,
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
            query?:  Partial<{
  /**
   * 제품명 또는 브랜드명 검색어
   */
  keyword: string;
  categoryIds: Array<number>;
  brandIds: Array<number>;
  moistureLevel: Array<number>;
  oilLevel: Array<number>;
  includeIngredientIds: Array<number>;
  excludeIngredientIds: Array<number>;
  excludeCodes: Array<("FRAGRANCE_ALLERGENS" | "DRYING_ALCOHOLS" | "HARSH_PRESERVATIVES" | "SULFATES" | "CYCLIC_SILICONES" | "SYNTHETIC_COLORANTS")>;
  /**
   * 선택적인 단일 피부타입. 기존 필터와 AND로 결합한다. 빈 값은 미지정으로 처리하고 반복 전달 시 첫 값을 사용한다
   */
  skinType: ("DRY" | "OILY" | "SENSITIVE" | "COMBINATION");
}>,

          }
      responses: {200: Schemas.ProductCountResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
/**
 * 성분을 ID, 이름과 피부 작용 태그만 담아 페이지 단위로 조회한다. ingredientIds 를 보내면 요청한 순서대로 해당 성분만 조회하고, 보내지 않으면 전체 성분을 조회한다. 존재하지 않는 ID 는 결과와 전체 개수에서 제외한다. usedInProducts 를 true 로 보내면 제품 전성분에 한 번 이상 쓰인 성분만 조회한다.
 */
export type get_FindIngredients = {
      method: "GET",
      path: "/api/ingredients",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{
  ingredientIds: Array<number>;
  usedInProducts: boolean;
  /**
   * 조회할 페이지 번호 (1부터 시작)
   */
  page: number;
  /**
   * 페이지당 항목 개수
   */
  size: number;
}>,

          }
      responses: {200: Schemas.IngredientPageResponse,
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
 * 검색어에 해당하는 성분을 ID, 이름과 피부 작용 태그만 담아 검색어에 잘 맞는 순서로 최대 5 건 반환한다. match 는 한글명, 영문명 또는 이명 중 실제로 일치한 원문과 그 원문을 기준으로 한 UTF-16 반열림 구간을 제공한다.
 */
export type get_SuggestIngredients = {
      method: "GET",
      path: "/api/ingredients/suggestions",
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
 * 배너가 게시 중인 큐레이션을 지정된 순서로 조회한다.
 */
export type get_FindCurations = {
      method: "GET",
      path: "/api/curations",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.CurationListResponse,
500: Schemas.ProblemDetail,
},

    }
/**
 * 요청한 ID의 큐레이션 상세를 조회한다. 상세가 게시되지 않은 큐레이션은 조회할 수 없다.
 */
export type get_FindCuration = {
      method: "GET",
      path: "/api/curations/{curationId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { curationId: number },

          }
      responses: {200: Schemas.CurationDetailResponse,
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
      responses: {200: Schemas.BrandOverviewResponse,
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
export type get_FindAll = {
      method: "GET",
      path: "/api/admin/product-requests",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{
  status: ("RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED");
  /**
   * 조회할 페이지 번호 (1부터 시작)
   */
  page: number;
  /**
   * 페이지당 항목 개수
   */
  size: number;
}>,

          }
      responses: {200: Schemas.AdminProductRequestPageResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
export type get_FindById = {
      method: "GET",
      path: "/api/admin/product-requests/{requestId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { requestId: string },

          }
      responses: {200: Schemas.AdminProductRequestResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
export type get_FindAll_1 = {
      method: "GET",
      path: "/api/admin/feedbacks",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{
  status: ("RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED");
  type: ("BUG_REPORT" | "IMPROVEMENT" | "OTHER" | "PRODUCT_CORRECTION");
  /**
   * 조회할 페이지 번호 (1부터 시작)
   */
  page: number;
  /**
   * 페이지당 항목 개수
   */
  size: number;
}>,

          }
      responses: {200: Schemas.AdminFeedbackPageResponse,
400: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }
export type get_FindById_1 = {
      method: "GET",
      path: "/api/admin/feedbacks/{feedbackId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {

        path:  { feedbackId: string },

          }
      responses: {200: Schemas.AdminFeedbackResponse,
400: Schemas.ProblemDetail,
404: Schemas.ProblemDetail,
500: Schemas.ProblemDetail,
},

    }

  }

     export type EndpointByMethod = {
     post: {
           "/api/search-keywords": Endpoints.post_Record,
"/api/products/{productId}/views": Endpoints.post_IncreaseViewCount,
"/api/products/{productId}/correction-requests": Endpoints.post_SubmitProductCorrection,
"/api/products/registration-requests": Endpoints.post_Submit,
"/api/pending-images": Endpoints.post_UploadImages,
"/api/feedbacks": Endpoints.post_Submit_1,
"/api/admin/login": Endpoints.post_Login
         },
patch: {
           "/api/admin/product-requests/{requestId}/status": Endpoints.patch_ChangeStatus,
"/api/admin/feedbacks/{feedbackId}/status": Endpoints.patch_ChangeStatus_1
         },
get: {
           "/api/storage": Endpoints.get_FindStorageProducts,
"/api/skin-types": Endpoints.get_FindSkinTypes,
"/api/search-keywords/rankings": Endpoints.get_Rankings,
"/api/products": Endpoints.get_FindProducts,
"/api/products/{productId}": Endpoints.get_FindProductDetail,
"/api/products/suggestions": Endpoints.get_SuggestProducts,
"/api/products/share-matches": Endpoints.get_MatchSharedProduct,
"/api/products/rankings": Endpoints.get_FindRankings,
"/api/products/count": Endpoints.get_CountProducts,
"/api/ingredients": Endpoints.get_FindIngredients,
"/api/ingredients/{ingredientId}": Endpoints.get_FindIngredientDetail,
"/api/ingredients/suggestions": Endpoints.get_SuggestIngredients,
"/api/exclude-codes": Endpoints.get_FindExcludeCodes,
"/api/curations": Endpoints.get_FindCurations,
"/api/curations/{curationId}": Endpoints.get_FindCuration,
"/api/categories": Endpoints.get_FindCategories,
"/api/brands": Endpoints.get_FindBrands,
"/api/brands/{brandId}": Endpoints.get_FindBrand,
"/api/admin/product-requests": Endpoints.get_FindAll,
"/api/admin/product-requests/{requestId}": Endpoints.get_FindById,
"/api/admin/feedbacks": Endpoints.get_FindAll_1,
"/api/admin/feedbacks/{feedbackId}": Endpoints.get_FindById_1
         }
     }

    export type PostEndpoints = EndpointByMethod["post"]
export type PatchEndpoints = EndpointByMethod["patch"]
export type GetEndpoints = EndpointByMethod["get"]
