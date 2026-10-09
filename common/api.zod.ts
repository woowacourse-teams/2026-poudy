// @ts-nocheck
import type * as __TypedOpenapi from "./api.zod.types.js";

  import { z } from "zod";

// <Schemas>
export type SearchKeywordRequest = __TypedOpenapi.Schemas.SearchKeywordRequest;
export const SearchKeywordRequest = z.object({ keyword: z.string().min(1).max(100) });

export type ProductCorrectionRequest = __TypedOpenapi.Schemas.ProductCorrectionRequest;
export const ProductCorrectionRequest = z.object({ content: z.string().min(10).max(2000), imageIds: z.array(z.uuid()).min(0).max(5).nullable().optional() });

export type ProductRegistrationRequest = __TypedOpenapi.Schemas.ProductRegistrationRequest;
export const ProductRegistrationRequest = z.object({ productName: z.string().min(1).max(200), brandName: z.string().min(0).max(100).nullable().optional() });

export type FeedbackImageUploadResponse = __TypedOpenapi.Schemas.FeedbackImageUploadResponse;
export const FeedbackImageUploadResponse = z.object({ imageIds: z.array(z.uuid()).min(1).max(5) });

export type FeedbackType = __TypedOpenapi.Schemas.FeedbackType;
export const FeedbackType = z.enum(["BUG_REPORT", "IMPROVEMENT", "OTHER"]);

export type FeedbackRequest = __TypedOpenapi.Schemas.FeedbackRequest;
export const FeedbackRequest = z.object({ type: FeedbackType, content: z.string().min(10).max(2000), path: z.string().min(1).max(500).nullable().optional(), imageIds: z.array(z.uuid()).min(0).max(5).nullable().optional() });

export type AdminLoginRequest = __TypedOpenapi.Schemas.AdminLoginRequest;
export const AdminLoginRequest = z.object({ username: z.string().min(1).regex(new RegExp(".*\\S.*")), password: z.string().min(1).regex(new RegExp(".*\\S.*")) });

export type ProductRequestStatus = __TypedOpenapi.Schemas.ProductRequestStatus;
export const ProductRequestStatus = z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]);

export type AdminProductRequestStatusUpdateRequest = __TypedOpenapi.Schemas.AdminProductRequestStatusUpdateRequest;
export const AdminProductRequestStatusUpdateRequest = z.object({ status: ProductRequestStatus });

export type AdminProductRequestResponse = __TypedOpenapi.Schemas.AdminProductRequestResponse;
export const AdminProductRequestResponse = z.object({ requestId: z.uuid(), productName: z.string(), brandName: z.string().nullable(), requestedAt: z.iso.datetime({ offset: true }), status: ProductRequestStatus, statusChangedAt: z.iso.datetime({ offset: true }), completedAt: z.iso.datetime({ offset: true }).nullable() });

export type FeedbackStatus = __TypedOpenapi.Schemas.FeedbackStatus;
export const FeedbackStatus = z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]);

export type AdminFeedbackStatusUpdateRequest = __TypedOpenapi.Schemas.AdminFeedbackStatusUpdateRequest;
export const AdminFeedbackStatusUpdateRequest = z.object({ status: FeedbackStatus });

export type AdminFeedbackImageResponse = __TypedOpenapi.Schemas.AdminFeedbackImageResponse;
export const AdminFeedbackImageResponse = z.object({ imageId: z.uuid(), extension: z.string() });

export type FeedbackSubjectType = __TypedOpenapi.Schemas.FeedbackSubjectType;
export const FeedbackSubjectType = z.enum(["BUG_REPORT", "IMPROVEMENT", "OTHER", "PRODUCT_CORRECTION"]);

export type AdminFeedbackResponse = __TypedOpenapi.Schemas.AdminFeedbackResponse;
export const AdminFeedbackResponse = z.object({ feedbackId: z.uuid(), type: FeedbackSubjectType, content: z.string(), path: z.string().nullable(), productId: z.number().int().nullable(), productName: z.string().nullable(), receivedAt: z.iso.datetime({ offset: true }), status: FeedbackStatus, statusChangedAt: z.iso.datetime({ offset: true }), completedAt: z.iso.datetime({ offset: true }).nullable(), images: z.array(AdminFeedbackImageResponse) });

export type BrandResponse = __TypedOpenapi.Schemas.BrandResponse;
export const BrandResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string().nullable(), imageUrl: z.string().nullable() });

export type ProductResponse = __TypedOpenapi.Schemas.ProductResponse;
export const ProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3) });

export type StorageResponse = __TypedOpenapi.Schemas.StorageResponse;
export const StorageResponse = z.object({ items: z.array(ProductResponse) });

export type SkinType = __TypedOpenapi.Schemas.SkinType;
export const SkinType = z.enum(["DRY", "OILY", "SENSITIVE", "COMBINATION"]);

export type SkinTypeResponse = __TypedOpenapi.Schemas.SkinTypeResponse;
export const SkinTypeResponse = z.object({ code: SkinType, name: z.string() });

export type SkinTypesResponse = __TypedOpenapi.Schemas.SkinTypesResponse;
export const SkinTypesResponse = z.object({ items: z.array(SkinTypeResponse) });

export type RankingChangeItem = __TypedOpenapi.Schemas.RankingChangeItem;
export const RankingChangeItem = z.object({ movement: z.string(), steps: z.number().int() });

export type RankingItem = __TypedOpenapi.Schemas.RankingItem;
export const RankingItem = z.object({ rank: z.number().int(), keyword: z.string(), change: RankingChangeItem });

export type RankingsResponse = __TypedOpenapi.Schemas.RankingsResponse;
export const RankingsResponse = z.object({ items: z.array(RankingItem) });

export type ExcludeCode = __TypedOpenapi.Schemas.ExcludeCode;
export const ExcludeCode = z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"]);

export type ProductSort = __TypedOpenapi.Schemas.ProductSort;
export const ProductSort = z.enum(["DEFAULT", "CREATED_ASC", "PRICE_DESC", "PRICE_ASC", "UNIT_PRICE_DESC", "UNIT_PRICE_ASC"]).default("DEFAULT");

export type CategoryChildResponse = __TypedOpenapi.Schemas.CategoryChildResponse;
export const CategoryChildResponse = z.object({ id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryResponse = __TypedOpenapi.Schemas.CategoryResponse;
export const CategoryResponse = z.object({ id: z.number().int(), name: z.string(), children: z.array(CategoryChildResponse), productCount: z.number().int() });

export type PaginationResponse = __TypedOpenapi.Schemas.PaginationResponse;
export const PaginationResponse = z.object({ page: z.number().int(), size: z.number().int(), totalElements: z.number().int(), totalPages: z.number().int(), hasNext: z.boolean() });

export type ProductFilterOptionsResponse = __TypedOpenapi.Schemas.ProductFilterOptionsResponse;
export const ProductFilterOptionsResponse = z.object({ brands: z.array(BrandResponse), categories: z.array(CategoryResponse), skinTypes: z.array(SkinTypeResponse) });

export type ProductPageResponse = __TypedOpenapi.Schemas.ProductPageResponse;
export const ProductPageResponse = z.object({ items: z.array(ProductResponse), pagination: PaginationResponse, brands: z.array(BrandResponse), categories: z.array(CategoryResponse), skinTypes: z.array(SkinTypeResponse), filterOptions: ProductFilterOptionsResponse.optional() });

export type CategorySummaryResponse = __TypedOpenapi.Schemas.CategorySummaryResponse;
export const CategorySummaryResponse = z.object({ id: z.number().int(), name: z.string() });

export type CategoryPathResponse = __TypedOpenapi.Schemas.CategoryPathResponse;
export const CategoryPathResponse = z.object({ id: z.number().int(), name: z.string(), child: CategorySummaryResponse });

export type ExcludeGroupResponse = __TypedOpenapi.Schemas.ExcludeGroupResponse;
export const ExcludeGroupResponse = z.object({ name: z.string(), contains: z.boolean() });

export type FormulationRoleResponse = __TypedOpenapi.Schemas.FormulationRoleResponse;
export const FormulationRoleResponse = z.object({ id: z.string(), code: z.string(), name: z.string() });

export type IngredientGroupSummaryResponse = __TypedOpenapi.Schemas.IngredientGroupSummaryResponse;
export const IngredientGroupSummaryResponse = z.object({ code: z.string(), name: z.string() });

export type ProductVariantResponse = __TypedOpenapi.Schemas.ProductVariantResponse;
export const ProductVariantResponse = z.object({ id: z.number().int(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), status: z.string() });

export type ProductPartSummaryResponse = __TypedOpenapi.Schemas.ProductPartSummaryResponse;
export const ProductPartSummaryResponse = z.object({ id: z.number().int(), name: z.string().nullable(), cautionCount: z.number().int() });

export type SkinEffectResponse = __TypedOpenapi.Schemas.SkinEffectResponse;
export const SkinEffectResponse = z.object({ id: z.string(), code: z.string(), name: z.string() });

export type ProductIngredientResponse = __TypedOpenapi.Schemas.ProductIngredientResponse;
export const ProductIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse) });

export type SkinEffectIngredientResponse = __TypedOpenapi.Schemas.SkinEffectIngredientResponse;
export const SkinEffectIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string() });

export type SkinEffectItemResponse = __TypedOpenapi.Schemas.SkinEffectItemResponse;
export const SkinEffectItemResponse = z.object({ ingredientGroup: IngredientGroupSummaryResponse.nullable(), ingredients: z.array(SkinEffectIngredientResponse) });

export type SkinEffectGroupResponse = __TypedOpenapi.Schemas.SkinEffectGroupResponse;
export const SkinEffectGroupResponse = z.object({ id: z.string(), code: z.string(), name: z.string(), ingredientIds: z.array(z.number().int()), items: z.array(SkinEffectItemResponse) });

export type ProductPartResponse = __TypedOpenapi.Schemas.ProductPartResponse;
export const ProductPartResponse = z.object({ id: z.number().int(), name: z.string().nullable(), ingredients: z.array(ProductIngredientResponse), skinEffectGroups: z.array(SkinEffectGroupResponse), excludeGroups: z.array(ExcludeGroupResponse) });

export type ProductDetailResponse = __TypedOpenapi.Schemas.ProductDetailResponse;
export const ProductDetailResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, categories: z.array(CategoryPathResponse), imageUrl: z.string(), variants: z.array(ProductVariantResponse), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3), productParts: z.array(ProductPartSummaryResponse), selectedPart: ProductPartResponse.nullable(), updatedAt: z.iso.datetime({ offset: true }) });

export type SimilarProductResponse = __TypedOpenapi.Schemas.SimilarProductResponse;
export const SimilarProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, imageUrl: z.string(), partId: z.number().int(), containsExcludedIngredient: z.boolean() });

export type ProductSimilarityResponse = __TypedOpenapi.Schemas.ProductSimilarityResponse;
export const ProductSimilarityResponse = z.object({ partId: z.number().int().nullable(), calculated: z.boolean(), items: z.array(SimilarProductResponse) });

export type ProductMatchField = __TypedOpenapi.Schemas.ProductMatchField;
export const ProductMatchField = z.enum(["PRODUCT_NAME", "BRAND_NAME"]);

export type ProductSuggestionMatchResponse = __TypedOpenapi.Schemas.ProductSuggestionMatchResponse;
export const ProductSuggestionMatchResponse = z.object({ field: ProductMatchField, text: z.string(), startIndex: z.number().int().min(0), endIndexExclusive: z.number().int().min(1) });

export type ProductSuggestionResponse = __TypedOpenapi.Schemas.ProductSuggestionResponse;
export const ProductSuggestionResponse = z.object({ id: z.number().int(), name: z.string(), imageUrl: z.string(), brandName: z.string(), match: ProductSuggestionMatchResponse });

export type ProductSuggestionPageResponse = __TypedOpenapi.Schemas.ProductSuggestionPageResponse;
export const ProductSuggestionPageResponse = z.object({ items: z.array(ProductSuggestionResponse), pagination: PaginationResponse });

export type ShareMatchStatus = __TypedOpenapi.Schemas.ShareMatchStatus;
export const ShareMatchStatus = z.enum(["MATCHED", "NOT_FOUND"]);

export type ShareMatchResponse = __TypedOpenapi.Schemas.ShareMatchResponse;
export const ShareMatchResponse = z.object({ status: ShareMatchStatus, productId: z.number().int().nullable().optional(), keyword: z.string().nullable().optional() });

export type ProductRankingProductResponse = __TypedOpenapi.Schemas.ProductRankingProductResponse;
export const ProductRankingProductResponse = z.object({ id: z.number().int(), name: z.string(), brandName: z.string(), imageUrl: z.string(), price: z.number().int(), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3) });

export type ProductRankingItemResponse = __TypedOpenapi.Schemas.ProductRankingItemResponse;
export const ProductRankingItemResponse = z.object({ product: ProductRankingProductResponse });

export type ProductRankingResponse = __TypedOpenapi.Schemas.ProductRankingResponse;
export const ProductRankingResponse = z.object({ items: z.array(ProductRankingItemResponse) });

export type ProductCountResponse = __TypedOpenapi.Schemas.ProductCountResponse;
export const ProductCountResponse = z.object({ count: z.number().int() });

export type IngredientResponse = __TypedOpenapi.Schemas.IngredientResponse;
export const IngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), skinEffects: z.array(SkinEffectResponse) });

export type IngredientPageResponse = __TypedOpenapi.Schemas.IngredientPageResponse;
export const IngredientPageResponse = z.object({ items: z.array(IngredientResponse), pagination: PaginationResponse });

export type IngredientDetailResponse = __TypedOpenapi.Schemas.IngredientDetailResponse;
export const IngredientDetailResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), description: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), groupCodes: z.array(z.string()), productCount: z.number().int(), infoSources: z.array(z.string()), effectSources: z.array(z.string()), updatedAt: z.iso.datetime({ offset: true }) });

export type IngredientGroupSuggestionResponse = __TypedOpenapi.Schemas.IngredientGroupSuggestionResponse;
export const IngredientGroupSuggestionResponse = z.object({ code: z.string(), name: z.string(), ingredientIds: z.array(z.number().int()) });

export type IngredientMatchField = __TypedOpenapi.Schemas.IngredientMatchField;
export const IngredientMatchField = z.enum(["KOREAN_NAME", "ENGLISH_NAME", "ALIAS"]);

export type IngredientSuggestionMatchResponse = __TypedOpenapi.Schemas.IngredientSuggestionMatchResponse;
export const IngredientSuggestionMatchResponse = z.object({ field: IngredientMatchField, text: z.string(), startIndex: z.number().int().min(0), endIndexExclusive: z.number().int().min(1) });

export type IngredientSuggestionResponse = __TypedOpenapi.Schemas.IngredientSuggestionResponse;
export const IngredientSuggestionResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), skinEffects: z.array(SkinEffectResponse), match: IngredientSuggestionMatchResponse });

export type IngredientListResponse = __TypedOpenapi.Schemas.IngredientListResponse;
export const IngredientListResponse = z.object({ items: z.array(IngredientSuggestionResponse), groups: z.array(IngredientGroupSuggestionResponse) });

export type IngredientGroupMemberResponse = __TypedOpenapi.Schemas.IngredientGroupMemberResponse;
export const IngredientGroupMemberResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string().nullable() });

export type IngredientGroupResponse = __TypedOpenapi.Schemas.IngredientGroupResponse;
export const IngredientGroupResponse = z.object({ code: z.string(), name: z.string(), englishName: z.string().nullable(), description: z.string(), ingredients: z.array(IngredientGroupMemberResponse) });

export type IngredientSummaryResponse = __TypedOpenapi.Schemas.IngredientSummaryResponse;
export const IngredientSummaryResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string() });

export type ExcludeCodeResponse = __TypedOpenapi.Schemas.ExcludeCodeResponse;
export const ExcludeCodeResponse = z.object({ code: z.string(), name: z.string(), description: z.string(), ingredients: z.array(IngredientSummaryResponse) });

export type ExcludeCodeListResponse = __TypedOpenapi.Schemas.ExcludeCodeListResponse;
export const ExcludeCodeListResponse = z.object({ items: z.array(ExcludeCodeResponse) });

export type CurationSummaryResponse = __TypedOpenapi.Schemas.CurationSummaryResponse;
export const CurationSummaryResponse = z.object({ id: z.number().int(), title: z.string(), description: z.string(), thumbnailImageUrl: z.string() });

export type CurationListResponse = __TypedOpenapi.Schemas.CurationListResponse;
export const CurationListResponse = z.object({ items: z.array(CurationSummaryResponse) });

export type CurationImageBlockResponse = __TypedOpenapi.Schemas.CurationImageBlockResponse;
export const CurationImageBlockResponse = z.object({ id: z.uuid(), type: z.literal("IMAGE"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), imageUrl: z.string(), altText: z.string().nullable(), bodyText: z.string().nullable() });

export type CurationProductResponse = __TypedOpenapi.Schemas.CurationProductResponse;
export const CurationProductResponse = z.object({ id: z.number().int(), name: z.string(), brandName: z.string(), imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3) });

export type CurationProductsBlockResponse = __TypedOpenapi.Schemas.CurationProductsBlockResponse;
export const CurationProductsBlockResponse = z.object({ id: z.uuid(), type: z.literal("PRODUCTS"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), products: z.array(CurationProductResponse).min(1).max(2147483647) });

export type CurationFilterResponse = __TypedOpenapi.Schemas.CurationFilterResponse;
export const CurationFilterResponse = z.object({ id: z.uuid(), label: z.string() });

export type CurationProductItemResponse = __TypedOpenapi.Schemas.CurationProductItemResponse;
export const CurationProductItemResponse = z.object({ product: CurationProductResponse, filterIds: z.array(z.uuid()).min(1).max(2147483647) });

export type CurationProductsByFilterBlockResponse = __TypedOpenapi.Schemas.CurationProductsByFilterBlockResponse;
export const CurationProductsByFilterBlockResponse = z.object({ id: z.uuid(), type: z.literal("PRODUCTS_BY_FILTER"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), filters: z.array(CurationFilterResponse).min(1).max(2147483647), products: z.array(CurationProductItemResponse).min(1).max(2147483647) });

export type CurationBlockResponse = __TypedOpenapi.Schemas.CurationBlockResponse;
export const CurationBlockResponse = z.discriminatedUnion("type", [CurationImageBlockResponse.extend({ type: z.literal("IMAGE") }), CurationProductsBlockResponse.extend({ type: z.literal("PRODUCTS") }), CurationProductsByFilterBlockResponse.extend({ type: z.literal("PRODUCTS_BY_FILTER") })]);

export type CurationDetailResponse = __TypedOpenapi.Schemas.CurationDetailResponse;
export const CurationDetailResponse = z.object({ id: z.number().int(), title: z.string(), description: z.string(), blocks: z.array(CurationBlockResponse) });

export type CategoryListResponse = __TypedOpenapi.Schemas.CategoryListResponse;
export const CategoryListResponse = z.object({ items: z.array(CategoryResponse) });

export type BrandSummaryResponse = __TypedOpenapi.Schemas.BrandSummaryResponse;
export const BrandSummaryResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string().nullable(), imageUrl: z.string().nullable(), productCount: z.number().int() });

export type BrandOverviewResponse = __TypedOpenapi.Schemas.BrandOverviewResponse;
export const BrandOverviewResponse = z.object({ items: z.array(BrandSummaryResponse) });

export type BrandDetailResponse = __TypedOpenapi.Schemas.BrandDetailResponse;
export const BrandDetailResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string().nullable(), imageUrl: z.string().nullable(), categories: z.array(CategoryResponse) });

export type AdminProductRequestPageResponse = __TypedOpenapi.Schemas.AdminProductRequestPageResponse;
export const AdminProductRequestPageResponse = z.object({ items: z.array(AdminProductRequestResponse), pagination: PaginationResponse });

export type AdminFeedbackPageResponse = __TypedOpenapi.Schemas.AdminFeedbackPageResponse;
export const AdminFeedbackPageResponse = z.object({ items: z.array(AdminFeedbackResponse), pagination: PaginationResponse });

export type ErrorCode = __TypedOpenapi.Schemas.ErrorCode;
export const ErrorCode = z.enum(["INVALID_QUERY_PARAMETER", "INVALID_REQUEST_BODY", "INVALID_FEEDBACK_IMAGE", "INVALID_FEEDBACK_IMAGE_ID", "CONFLICTING_INGREDIENT_FILTER", "PAYLOAD_TOO_LARGE", "TOO_MANY_REQUESTS", "UNSUPPORTED_REQUEST", "FEEDBACK_NOT_FOUND", "PRODUCT_REQUEST_NOT_FOUND", "CURATION_NOT_FOUND", "PRODUCT_NOT_FOUND", "PRODUCT_PART_NOT_FOUND", "BRAND_NOT_FOUND", "INGREDIENT_NOT_FOUND", "INGREDIENT_GROUP_NOT_FOUND", "ENDPOINT_NOT_FOUND", "INTERNAL_SERVER_ERROR"]);

export type ProblemDetail = __TypedOpenapi.Schemas.ProblemDetail;
export const ProblemDetail = z.object({ type: z.url().optional(), title: z.string(), status: z.number().int(), detail: z.string(), instance: z.string().optional(), code: ErrorCode });

// </Schemas>

// <Endpoints>
export type post_Record = __TypedOpenapi.Endpoints.post_Record;
export const post_Record = {
  method: z.literal("POST"),
  path: z.literal("/api/search-keywords"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: SearchKeywordRequest },
  responses: { 204: z.unknown(), 400: ProblemDetail, 500: ProblemDetail },
};

export type post_IncreaseViewCount = __TypedOpenapi.Endpoints.post_IncreaseViewCount;
export const post_IncreaseViewCount = {
  method: z.literal("POST"),
  path: z.literal("/api/products/{productId}/views"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type post_SubmitProductCorrection = __TypedOpenapi.Endpoints.post_SubmitProductCorrection;
export const post_SubmitProductCorrection = {
  method: z.literal("POST"),
  path: z.literal("/api/products/{productId}/correction-requests"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }), body: ProductCorrectionRequest },
  responses: { 204: z.unknown(), 400: ProblemDetail, 404: ProblemDetail, 429: ProblemDetail, 500: ProblemDetail },
};

export type post_Submit = __TypedOpenapi.Endpoints.post_Submit;
export const post_Submit = {
  method: z.literal("POST"),
  path: z.literal("/api/products/registration-requests"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: ProductRegistrationRequest },
  responses: { 202: z.unknown(), 400: ProblemDetail, 429: ProblemDetail, 500: ProblemDetail },
};

export type post_UploadImages = __TypedOpenapi.Endpoints.post_UploadImages;
export const post_UploadImages = {
  method: z.literal("POST"),
  path: z.literal("/api/pending-images"),
  requestFormat: z.literal("form-data"),
  responseFormat: z.literal("json"),
  parameters: { body: z.object({ images: z.array(z.custom<Blob>((v) => typeof Blob !== "undefined" && v instanceof Blob)).min(1).max(5) }) },
  responses: { 201: FeedbackImageUploadResponse, 400: ProblemDetail, 413: ProblemDetail, 429: ProblemDetail, 500: ProblemDetail },
};

export type post_Submit_1 = __TypedOpenapi.Endpoints.post_Submit_1;
export const post_Submit_1 = {
  method: z.literal("POST"),
  path: z.literal("/api/feedbacks"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: FeedbackRequest },
  responses: { 204: z.unknown(), 400: ProblemDetail, 429: ProblemDetail, 500: ProblemDetail },
};

export type post_Login = __TypedOpenapi.Endpoints.post_Login;
export const post_Login = {
  method: z.literal("POST"),
  path: z.literal("/api/admin/login"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: AdminLoginRequest },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: z.unknown(), 500: ProblemDetail },
};

export type patch_ChangeStatus = __TypedOpenapi.Endpoints.patch_ChangeStatus;
export const patch_ChangeStatus = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/product-requests/{requestId}/status"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ requestId: z.uuid() }), body: AdminProductRequestStatusUpdateRequest },
  responses: { 200: AdminProductRequestResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type patch_ChangeStatus_1 = __TypedOpenapi.Endpoints.patch_ChangeStatus_1;
export const patch_ChangeStatus_1 = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/feedbacks/{feedbackId}/status"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ feedbackId: z.uuid() }), body: AdminFeedbackStatusUpdateRequest },
  responses: { 200: AdminFeedbackResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindStorageProducts = __TypedOpenapi.Endpoints.get_FindStorageProducts;
export const get_FindStorageProducts = {
  method: z.literal("GET"),
  path: z.literal("/api/storage"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ productIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }) }) },
  responses: { 200: StorageResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindSkinTypes = __TypedOpenapi.Endpoints.get_FindSkinTypes;
export const get_FindSkinTypes = {
  method: z.literal("GET"),
  path: z.literal("/api/skin-types"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: SkinTypesResponse, 500: ProblemDetail },
};

export type get_Rankings = __TypedOpenapi.Endpoints.get_Rankings;
export const get_Rankings = {
  method: z.literal("GET"),
  path: z.literal("/api/search-keywords/rankings"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: RankingsResponse, 500: ProblemDetail },
};

export type get_FindProducts = __TypedOpenapi.Endpoints.get_FindProducts;
export const get_FindProducts = {
  method: z.literal("GET"),
  path: z.literal("/api/products"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ keyword: z.string().max(100).regex(new RegExp(".*\\S.*")), categoryIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), brandIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), moistureLevel: z.array(z.coerce.number().int().min(0).max(3)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), oilLevel: z.array(z.coerce.number().int().min(0).max(3)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeCodes: z.array(ExcludeCode).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), skinType: SkinType, sort: ProductSort, page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: ProductPageResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindProductDetail = __TypedOpenapi.Endpoints.get_FindProductDetail;
export const get_FindProductDetail = {
  method: z.literal("GET"),
  path: z.literal("/api/products/{productId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ partId: z.coerce.number().int() }).partial().optional(), path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 200: ProductDetailResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Find = __TypedOpenapi.Endpoints.get_Find;
export const get_Find = {
  method: z.literal("GET"),
  path: z.literal("/api/products/{productId}/similarities"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ partId: z.coerce.number().int() }).partial().optional(), path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 200: ProductSimilarityResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_SuggestProducts = __TypedOpenapi.Endpoints.get_SuggestProducts;
export const get_SuggestProducts = {
  method: z.literal("GET"),
  path: z.literal("/api/products/suggestions"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ keyword: z.string().min(1).max(100), page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }) },
  responses: { 200: ProductSuggestionPageResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_MatchSharedProduct = __TypedOpenapi.Endpoints.get_MatchSharedProduct;
export const get_MatchSharedProduct = {
  method: z.literal("GET"),
  path: z.literal("/api/products/share-matches"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ text: z.string().min(1).max(500) }) },
  responses: { 200: ShareMatchResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindRankings = __TypedOpenapi.Endpoints.get_FindRankings;
export const get_FindRankings = {
  method: z.literal("GET"),
  path: z.literal("/api/products/rankings"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ categoryIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), days: z.coerce.number().int().gt(0) }).partial().optional() },
  responses: { 200: ProductRankingResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_CountProducts = __TypedOpenapi.Endpoints.get_CountProducts;
export const get_CountProducts = {
  method: z.literal("GET"),
  path: z.literal("/api/products/count"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ keyword: z.string().max(100).regex(new RegExp(".*\\S.*")), categoryIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), brandIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), moistureLevel: z.array(z.coerce.number().int().min(0).max(3)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), oilLevel: z.array(z.coerce.number().int().min(0).max(3)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeCodes: z.array(ExcludeCode).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), skinType: SkinType }).partial().optional() },
  responses: { 200: ProductCountResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindIngredients = __TypedOpenapi.Endpoints.get_FindIngredients;
export const get_FindIngredients = {
  method: z.literal("GET"),
  path: z.literal("/api/ingredients"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ ingredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), usedInProducts: z.coerce.boolean(), page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: IngredientPageResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindIngredientDetail = __TypedOpenapi.Endpoints.get_FindIngredientDetail;
export const get_FindIngredientDetail = {
  method: z.literal("GET"),
  path: z.literal("/api/ingredients/{ingredientId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ ingredientId: z.coerce.number().int() }) },
  responses: { 200: IngredientDetailResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_SuggestIngredients = __TypedOpenapi.Endpoints.get_SuggestIngredients;
export const get_SuggestIngredients = {
  method: z.literal("GET"),
  path: z.literal("/api/ingredients/suggestions"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ keyword: z.string().min(1).max(100) }) },
  responses: { 200: IngredientListResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindIngredientGroup = __TypedOpenapi.Endpoints.get_FindIngredientGroup;
export const get_FindIngredientGroup = {
  method: z.literal("GET"),
  path: z.literal("/api/ingredient-groups/{code}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ code: z.string() }) },
  responses: { 200: IngredientGroupResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindExcludeCodes = __TypedOpenapi.Endpoints.get_FindExcludeCodes;
export const get_FindExcludeCodes = {
  method: z.literal("GET"),
  path: z.literal("/api/exclude-codes"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: ExcludeCodeListResponse, 500: ProblemDetail },
};

export type get_FindCurations = __TypedOpenapi.Endpoints.get_FindCurations;
export const get_FindCurations = {
  method: z.literal("GET"),
  path: z.literal("/api/curations"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: CurationListResponse, 500: ProblemDetail },
};

export type get_FindCuration = __TypedOpenapi.Endpoints.get_FindCuration;
export const get_FindCuration = {
  method: z.literal("GET"),
  path: z.literal("/api/curations/{curationId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ curationId: z.coerce.number().int().gt(0) }) },
  responses: { 200: CurationDetailResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindCategories = __TypedOpenapi.Endpoints.get_FindCategories;
export const get_FindCategories = {
  method: z.literal("GET"),
  path: z.literal("/api/categories"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: CategoryListResponse, 500: ProblemDetail },
};

export type get_FindBrands = __TypedOpenapi.Endpoints.get_FindBrands;
export const get_FindBrands = {
  method: z.literal("GET"),
  path: z.literal("/api/brands"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: BrandOverviewResponse, 500: ProblemDetail },
};

export type get_FindBrand = __TypedOpenapi.Endpoints.get_FindBrand;
export const get_FindBrand = {
  method: z.literal("GET"),
  path: z.literal("/api/brands/{brandId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ brandId: z.coerce.number().int() }) },
  responses: { 200: BrandDetailResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindAll = __TypedOpenapi.Endpoints.get_FindAll;
export const get_FindAll = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/product-requests"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ status: ProductRequestStatus, page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: AdminProductRequestPageResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindById = __TypedOpenapi.Endpoints.get_FindById;
export const get_FindById = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/product-requests/{requestId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ requestId: z.uuid() }) },
  responses: { 200: AdminProductRequestResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindAll_1 = __TypedOpenapi.Endpoints.get_FindAll_1;
export const get_FindAll_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/feedbacks"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ status: FeedbackStatus, type: FeedbackSubjectType, page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: AdminFeedbackPageResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindById_1 = __TypedOpenapi.Endpoints.get_FindById_1;
export const get_FindById_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/feedbacks/{feedbackId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ feedbackId: z.uuid() }) },
  responses: { 200: AdminFeedbackResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

// </Endpoints>

     // <EndpointByMethod>
     export const EndpointByMethod: __TypedOpenapi.EndpointByMethod = {
     post: {
           "/api/search-keywords": post_Record as any,
"/api/products/{productId}/views": post_IncreaseViewCount as any,
"/api/products/{productId}/correction-requests": post_SubmitProductCorrection as any,
"/api/products/registration-requests": post_Submit as any,
"/api/pending-images": post_UploadImages as any,
"/api/feedbacks": post_Submit_1 as any,
"/api/admin/login": post_Login as any
         },
patch: {
           "/api/admin/product-requests/{requestId}/status": patch_ChangeStatus as any,
"/api/admin/feedbacks/{feedbackId}/status": patch_ChangeStatus_1 as any
         },
get: {
           "/api/storage": get_FindStorageProducts as any,
"/api/skin-types": get_FindSkinTypes as any,
"/api/search-keywords/rankings": get_Rankings as any,
"/api/products": get_FindProducts as any,
"/api/products/{productId}": get_FindProductDetail as any,
"/api/products/{productId}/similarities": get_Find as any,
"/api/products/suggestions": get_SuggestProducts as any,
"/api/products/share-matches": get_MatchSharedProduct as any,
"/api/products/rankings": get_FindRankings as any,
"/api/products/count": get_CountProducts as any,
"/api/ingredients": get_FindIngredients as any,
"/api/ingredients/{ingredientId}": get_FindIngredientDetail as any,
"/api/ingredients/suggestions": get_SuggestIngredients as any,
"/api/ingredient-groups/{code}": get_FindIngredientGroup as any,
"/api/exclude-codes": get_FindExcludeCodes as any,
"/api/curations": get_FindCurations as any,
"/api/curations/{curationId}": get_FindCuration as any,
"/api/categories": get_FindCategories as any,
"/api/brands": get_FindBrands as any,
"/api/brands/{brandId}": get_FindBrand as any,
"/api/admin/product-requests": get_FindAll as any,
"/api/admin/product-requests/{requestId}": get_FindById as any,
"/api/admin/feedbacks": get_FindAll_1 as any,
"/api/admin/feedbacks/{feedbackId}": get_FindById_1 as any
         }
     }
     export type EndpointByMethod = __TypedOpenapi.EndpointByMethod;
     // </EndpointByMethod>

    // <EndpointByMethod.Shorthands>
    export type PostEndpoints = EndpointByMethod["post"]
export type PatchEndpoints = EndpointByMethod["patch"]
export type GetEndpoints = EndpointByMethod["get"]
    // </EndpointByMethod.Shorthands>

// <ApiClientTypes>
export type EndpointParameters = {
  body?: unknown;
  query?: unknown;
  header?: unknown;
  path?: unknown;
  cookie?: unknown;
};

export type MutationMethod = "post" | "put" | "patch" | "delete";
export type Method = "get" | "head" | "options" | MutationMethod;

export type RequestFormat = "json" | "form-data" | "form-url" | "binary" | "text";
export type ResponseFormat = "json" | "sse";
export type SecurityRequirements = readonly (readonly string[])[];

    // <EndpointRequestFormats>
    /** Non-json request body encodings; missing entries default to `"json"`. */
    export const endpointRequestFormats = {
    post: {
          "/api/pending-images": "form-data"
        }
    } as Partial<{ [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: RequestFormat }> }>;
    // </EndpointRequestFormats>

    // <EndpointResponseFormats>
    /** Non-json response body modes; missing entries default to `"json"`. SSE skips JSON parse + output validation. */
    export const endpointResponseFormats = {

    } as Partial<{ [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: ResponseFormat }> }>;
    // </EndpointResponseFormats>

    // <EndpointSecurityRequirements>
    /** OpenAPI security requirements applied when an endpoint has no explicit entry. */
    export const defaultSecurityRequirements = [] as SecurityRequirements;
    /** Endpoint-specific security requirements that differ from the default. */
    export const endpointSecurityRequirements = {

    } as Partial<{ [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: SecurityRequirements }> }>;
    // </EndpointSecurityRequirements>

export type DefaultEndpoint = {
  parameters?: EndpointParameters | undefined;
  responses?: Record<string, unknown>;
  responseHeaders?: Record<string, unknown>;
};

export type Endpoint<TConfig extends DefaultEndpoint = DefaultEndpoint> = {
  operationId: string;
  method: Method;
  path: string;
  requestFormat: RequestFormat;
  responseFormat: ResponseFormat;
  parameters?: TConfig["parameters"];
  meta: {
    alias: string;
    hasParameters: boolean;
    areParametersRequired: boolean;
  };
  responses?: TConfig["responses"];
  responseHeaders?: TConfig["responseHeaders"]
};

/**
 * Minimal response surface used by ApiClient — avoids depending on the DOM `Response`
 * global (helpful for Node without DOM lib). Structural typing accepts fetch Response.
 */
export interface FetcherResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    get(name: string): string | null;
    getSetCookie?: () => string[];
  };
  /** Present on fetch Response; used for SSE / streaming bodies. */
  body?: ReadableStream<Uint8Array> | null;
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  clone(): FetcherResponse;
}

export interface Fetcher {
    decodePathParams?: (path: string, pathParams: unknown) => string
  encodeSearchParams?: (searchParams: unknown) => URLSearchParams | undefined
  /** Merge cookie params into request headers (default: Cookie header). */
  encodeCookies?: (cookies: unknown, headers: Headers) => void
    //
    fetch: (input: {
      method: Method;
      url: URL;
      urlSearchParams?: URLSearchParams | undefined;
      parameters?: EndpointParameters | undefined;
      path: string;
      /** How to encode `parameters.body` (from OpenAPI requestBody content type). */
      requestFormat: RequestFormat;
      /** OpenAPI security requirements for this operation. Empty means no credentials are required. */
      security?: SecurityRequirements;
      overrides?: RequestInit;
      throwOnStatusError?: boolean
    }) => Promise<FetcherResponse>;
    parseResponseData?: (response: FetcherResponse) => Promise<unknown>
}

export const successStatusCodes = [200,201,202,203,204,205,206,207,208,226,300,301,302,303,304,305,306,307,308] as const;
export type SuccessStatusCode = typeof successStatusCodes[number];

export const errorStatusCodes = [400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,421,422,423,424,425,426,428,429,431,451,500,501,502,503,504,505,506,507,508,510,511] as const;
export type ErrorStatusCode = typeof errorStatusCodes[number];

// Taken from https://github.com/unjs/fetchdts/blob/ec4eaeab5d287116171fc1efd61f4a1ad34e4609/src/fetch.ts#L3
export interface TypedHeaders<TypedHeaderValues extends Record<string, string> | unknown> extends Omit<Headers, 'append' | 'delete' | 'get' | 'getSetCookie' | 'has' | 'set' | 'forEach'> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name, value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => (Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) | null
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[]
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name, value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) => void
  forEach: (callbackfn: (value: TypedHeaderValues[keyof TypedHeaderValues] | string & {}, key: Extract<keyof TypedHeaderValues, string> | string & {}, parent: TypedHeaders<TypedHeaderValues>) => void, thisArg?: any) => void
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedSuccessResponse<TSuccess, TStatusCode, THeaders> extends Omit<FetcherResponse, "ok" | "status" | "json" | "headers"> {
  ok: true;
  status: TStatusCode;
  headers: never extends THeaders ? FetcherResponse["headers"] : TypedHeaders<THeaders>;
  data: TSuccess;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TSuccess>;
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedErrorResponse<TData, TStatusCode, THeaders> extends Omit<FetcherResponse, "ok" | "status" | "json" | "headers"> {
  ok: false;
  status: TStatusCode;
  headers: never extends THeaders ? FetcherResponse["headers"] : TypedHeaders<THeaders>;
  data: TData;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TData>;
}

export type TypedApiResponse<TAllResponses = {}, THeaders = {}> = {
    [K in keyof TAllResponses]: K extends string
      ? K extends `${infer TStatusCode extends number}`
        ? TStatusCode extends SuccessStatusCode
          ? TypedSuccessResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
          : TypedErrorResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
        : never
      : K extends number
        ? K extends SuccessStatusCode
          ? TypedSuccessResponse<TAllResponses[K], K, K extends keyof THeaders ? THeaders[K] : never>
          : TypedErrorResponse<TAllResponses[K], K, K extends keyof THeaders ? THeaders[K] : never>
        : never;
  }[keyof TAllResponses];

type __TypedOpenapiSchema<TOutput, TInput = TOutput> = {
  readonly __typedOpenapiOutput?: TOutput;
  readonly __typedOpenapiInput?: TInput;
};
type OptionalUndefinedKeys<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};
type InferSchemaValue<T> = T extends __TypedOpenapiSchema<infer O> ? O : T extends z.ZodType ? z.infer<T> : T extends object ? { [K in keyof T]: InferSchemaValue<T[K]> } : T;
type InferSchemaInputRaw<T> = T extends __TypedOpenapiSchema<infer _O, infer I> ? I : T extends z.ZodType ? z.input<T> : T extends object ? { [K in keyof T]: InferSchemaInputRaw<T[K]> } : T;
type InferSchemaInput<T> = OptionalUndefinedKeys<InferSchemaInputRaw<T>>;

export type SafeApiResponse<TEndpoint> = TEndpoint extends { responses: infer TResponses }
  ? TResponses extends Record<string, unknown>
    ? TypedApiResponse<InferSchemaValue<TResponses>, TEndpoint extends { responseHeaders: infer THeaders } ? InferSchemaValue<THeaders> : never>
    : never
  : never

export type InferResponseByStatus<TEndpoint, TStatusCode> = Extract<SafeApiResponse<TEndpoint>, { status: TStatusCode }>

/**
 * Success-body payload — InferSchemaValue only on success statuses.
 * Filter with extends {} like the old Extract { data: {} } so unknown bodies (e.g. 304) drop out.
 */
export type InferSuccessData<TEndpoint> = TEndpoint extends { responses: infer TResponses }
  ? {
      [K in keyof TResponses]: K extends string
        ? K extends `${infer TStatusCode extends number}`
          ? TStatusCode extends SuccessStatusCode
            ? InferSchemaValue<TResponses[K]> extends infer D
              ? D extends {}
                ? D
                : never
              : never
            : never
          : never
        : K extends number
          ? K extends SuccessStatusCode
            ? InferSchemaValue<TResponses[K]> extends infer D
              ? D extends {}
                ? D
                : never
              : never
            : never
          : never;
    }[keyof TResponses]
  : never;

type RequiredKeys<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P;
}[keyof T];

type MaybeOptionalArg<T> = RequiredKeys<T> extends never ? [config?: T] : [config: T];
type NotNever<T> = [T] extends [never] ? false : true;

/** Call options merged onto inferred endpoint parameters. */
type ApiRequestOptions = {
  overrides?: RequestInit;
  withResponse?: boolean;
  throwOnStatusError?: boolean;
  validate?: ValidateSide;
};

/** Parameter bag for an endpoint + request options. */
export type ApiCallParams<TEndpoint> = TEndpoint extends { parameters: infer UParams }
  ? NotNever<UParams> extends true
    ? InferSchemaInput<UParams> & ApiRequestOptions
    : ApiRequestOptions
  : ApiRequestOptions;

/** Resolve response type from withResponse flag on the call config. */
export type ApiCallResult<TEndpoint, TParams> = TParams extends { withResponse: true }
  ? SafeApiResponse<TEndpoint>
  : InferSuccessData<TEndpoint>;

export type ValidateSide = "none" | "input" | "output" | "both";
export type OnValidate = (ctx: {
  side: "input" | "output";
  method: string;
  path: string;
  schema: unknown;
  value: unknown;
}) => unknown | Promise<unknown>;

// </ApiClientTypes>

// <TypedStatusError>
export class TypedStatusError<TData = unknown> extends Error {
  response: TypedErrorResponse<TData, ErrorStatusCode, unknown>;
  status: number;
  constructor(response: TypedErrorResponse<TData, ErrorStatusCode, unknown>) {
    super(`HTTP ${response.status}: ${response.statusText}`);
    this.name = 'TypedStatusError';
    this.response = response;
    this.status = response.status;
  }
}
// </TypedStatusError>

// <ValidateHelpers>
const defaultParse = (schema: unknown, value: unknown): unknown => {
  return (schema as { parse: (v: unknown) => unknown }).parse(value);
};

const runValidate = async (ctx: {
  side: "input" | "output";
  method: string;
  path: string;
  schema: unknown;
  value: unknown;
  onValidate?: OnValidate;
}): Promise<unknown> => {
  if (ctx.onValidate) return ctx.onValidate(ctx);
  return defaultParse(ctx.schema, ctx.value);
};
// </ValidateHelpers>

// <ApiClient>
export class ApiClient {
  baseUrl: string = "";
  successStatusCodes = successStatusCodes;
  errorStatusCodes = errorStatusCodes;
  validate: ValidateSide = "both";
  onValidate?: OnValidate;

  constructor(
    public fetcher: Fetcher,
    options?: { validate?: ValidateSide; onValidate?: OnValidate },
  ) {
    if (options?.validate !== undefined) this.validate = options.validate;
    if (options?.onValidate) this.onValidate = options.onValidate;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
    return this;
  }

  setValidate(validate: ValidateSide) {
    this.validate = validate;
    return this;
  }

  setOnValidate(onValidate: OnValidate | undefined) {
    if (onValidate === undefined) {
      delete this.onValidate;
    } else {
      this.onValidate = onValidate;
    }
    return this;
  }

  /**
   * Replace path parameters in URL
   * Supports both OpenAPI format {param} and Express format :param
   */
  defaultDecodePathParams = (url: string, params: unknown): string => {
    const record = (params ?? {}) as Record<string, unknown>;
    return url
      .replace(/{(\w+)}/g, (_, key: string) => (record[key] != null ? String(record[key]) : `{${key}}`))
      .replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => (record[key] != null ? String(record[key]) : `:${key}`));
  }

  /** Uses URLSearchParams, skips null/undefined values */
  defaultEncodeSearchParams = (queryParams: unknown): URLSearchParams | undefined => {
    if (!queryParams || typeof queryParams !== "object") return;

    const searchParams = new URLSearchParams();
    Object.entries(queryParams as Record<string, unknown>).forEach(([key, value]) => {
      if (value != null) {
        // Skip null/undefined values
        if (Array.isArray(value)) {
          value.forEach((val) => val != null && searchParams.append(key, String(val)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams;
  }

  /** Append cookie params as a Cookie header (or merge into existing). */
  defaultEncodeCookies = (cookies: unknown, headers: Headers): void => {
    if (!cookies || typeof cookies !== "object") return;
    const parts = Object.entries(cookies as Record<string, unknown>)
      .filter(([, value]) => value != null)
      .map(([key, value]) => `${key}=${String(value)}`);
    if (!parts.length) return;
    const existing = headers.get("cookie");
    headers.set("cookie", existing ? `${existing}; ${parts.join("; ")}` : parts.join("; "));
  }

  defaultParseResponseData = async (response: FetcherResponse): Promise<unknown> => {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return response.body ?? null;
    }
    if (contentType.startsWith("text/")) {
      return (await response.text())
    }

    if (contentType.toLowerCase().startsWith("application/octet-stream")) {
      return new Blob([await response.arrayBuffer()])
    }

    if (
      contentType.includes("application/json") ||
      (contentType.includes("application/") && contentType.includes("json")) ||
      contentType === "*/*"
      ) {
      try {
        return await response.json();
      } catch {
        return undefined
      }
    }

    return
  }

  // <ApiClient.post>
    post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<InferSuccessData<TEndpoint>>;

    post<Path extends keyof PostEndpoints, _TEndpoint extends PostEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("post", path, ...params);
    }
    // </ApiClient.post>

// <ApiClient.patch>
    patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<InferSuccessData<TEndpoint>>;

    patch<Path extends keyof PatchEndpoints, _TEndpoint extends PatchEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("patch", path, ...params);
    }
    // </ApiClient.patch>

// <ApiClient.get>
    get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<InferSuccessData<TEndpoint>>;

    get<Path extends keyof GetEndpoints, _TEndpoint extends GetEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("get", path, ...params);
    }
    // </ApiClient.get>

    // <ApiClient.request>
    /**
     * Generic request method with full type-safety for any endpoint
     */
    request<
      TMethod extends keyof EndpointByMethod,
      TPath extends keyof EndpointByMethod[TMethod],
      TEndpoint extends EndpointByMethod[TMethod][TPath]
    >(
      method: TMethod,
      path: TPath,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    request<
      TMethod extends keyof EndpointByMethod,
      TPath extends keyof EndpointByMethod[TMethod],
      TEndpoint extends EndpointByMethod[TMethod][TPath]
    >(
      method: TMethod,
      path: TPath,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<InferSuccessData<TEndpoint>>;

    request<
      TMethod extends keyof EndpointByMethod,
      TPath extends keyof EndpointByMethod[TMethod],
      TEndpoint extends EndpointByMethod[TMethod][TPath]
    >(
      method: TMethod,
      path: TPath,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
      return (async () => {
      const requestParams = params[0];
      const withResponse = requestParams?.withResponse;
      const throwOnStatusError = requestParams?.throwOnStatusError ?? (withResponse ? false : true);
      let overrides = requestParams?.overrides;
      const validateSide: ValidateSide = requestParams?.validate ?? this.validate;

      const parametersToSend: EndpointParameters = {};
      if (requestParams?.body !== undefined) parametersToSend.body = requestParams.body;
      if (requestParams?.query !== undefined) parametersToSend.query = requestParams.query;
      if (requestParams?.header !== undefined) parametersToSend.header = requestParams.header;
      if (requestParams?.path !== undefined) parametersToSend.path = requestParams.path;
      if (requestParams?.cookie !== undefined) parametersToSend.cookie = requestParams.cookie;

      type RuntimeEndpoint = {
        parameters?: Partial<Record<"body" | "query" | "header" | "path" | "cookie", unknown>>;
        responses?: Record<string, unknown>;
      };
      const endpointSchema = EndpointByMethod[method][path] as RuntimeEndpoint;
      const shouldValidateInput = validateSide === "input" || validateSide === "both";
      if (shouldValidateInput && endpointSchema.parameters) {
        const paramSchema = endpointSchema.parameters;
        for (const key of ["body", "query", "header", "path", "cookie"] as const) {
          const schema = paramSchema[key];
          const value = parametersToSend[key];
          if (schema !== undefined && value !== undefined) {
            parametersToSend[key] = await runValidate({
              side: "input",
              method: String(method),
              path: String(path),
              schema,
              value,
              ...(this.onValidate ? { onValidate: this.onValidate } : {}),
            });
          }
        }
      }

      const resolvedPath = (this.fetcher.decodePathParams ?? this.defaultDecodePathParams)(this.baseUrl + (path as string), parametersToSend.path ?? {});
      const url = new URL(resolvedPath);
      const urlSearchParams = (this.fetcher.encodeSearchParams ?? this.defaultEncodeSearchParams)(parametersToSend.query);

      if (parametersToSend.cookie) {
        const headers = new Headers((overrides as RequestInit | undefined)?.headers);
        (this.fetcher.encodeCookies ?? this.defaultEncodeCookies)(parametersToSend.cookie, headers);
        overrides = { ...overrides, headers };
      }

      const response = await this.fetcher.fetch({
        method: method,
        path: (path as string),
        url,
        ...(urlSearchParams ? { urlSearchParams } : {}),
        ...(Object.keys(parametersToSend).length ? { parameters: parametersToSend } : {}),
        requestFormat: endpointRequestFormats[method]?.[path] ?? "json",
        security: endpointSecurityRequirements[method]?.[path] ?? defaultSecurityRequirements,
        ...(overrides ? { overrides } : {}),
        throwOnStatusError
      });
          const responseFormat = endpointResponseFormats[method]?.[path] ?? "json";
          let data =
            responseFormat === "sse"
              ? (response.body ?? null)
              : await (this.fetcher.parseResponseData ?? this.defaultParseResponseData)(response);
          const shouldValidateOutput = validateSide === "output" || validateSide === "both";
          if (shouldValidateOutput && responseFormat !== "sse" && response.ok && endpointSchema?.responses) {
            const responseSchema = endpointSchema.responses[String(response.status)] ?? endpointSchema.responses["default"];
            if (responseSchema) {
              data = await runValidate({
                side: "output",
                method: String(method),
                path: String(path),
                schema: responseSchema,
                value: data,
                ...(this.onValidate ? { onValidate: this.onValidate } : {}),
              });
            }
          }
          const typedResponse = Object.assign(response, {
            data: data,
            json: () => Promise.resolve(data)
          }) as SafeApiResponse<TEndpoint>;

          if (throwOnStatusError && (errorStatusCodes as readonly number[]).includes(response.status)) {
            throw new TypedStatusError(typedResponse as TypedErrorResponse<unknown, ErrorStatusCode, unknown>);
          }

          return withResponse ? typedResponse : data;
      })() as Promise<any>
    }
    // </ApiClient.request>
}

export function createApiClient(
  fetcher: Fetcher,
  baseUrl?: string,
  options?: { validate?: ValidateSide; onValidate?: OnValidate },
) {
  return new ApiClient(fetcher, options).setBaseUrl(baseUrl ?? "");
}

/**
 Example usage:
 const api = createApiClient((method, url, params) =>
   fetch(url, { method, body: JSON.stringify(params) }).then((res) => res.json()),
 );
 api.get("/users").then((users) => console.log(users));
 api.post("/users", { body: { name: "John" } }).then((user) => console.log(user));
 api.put("/users/:id", { path: { id: 1 }, body: { name: "John" } }).then((user) => console.log(user));

 // With error handling
 const result = await api.get("/users/{id}", { path: { id: "123" }, withResponse: true });
 if (result.ok) {
   // Access data directly
   const user = result.data;
   console.log(user);

   // Or use the json() method for compatibility
   const userFromJson = await result.json();
   console.log(userFromJson);
 } else {
   const error = result.data;
   console.error(`Error ${result.status}:`, error);
 }
*/

// </ApiClient>
