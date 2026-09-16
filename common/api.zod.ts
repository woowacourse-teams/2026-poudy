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

export type FeedbackRequest = __TypedOpenapi.Schemas.FeedbackRequest;
export const FeedbackRequest = z.object({ type: z.enum(["BUG_REPORT", "IMPROVEMENT", "OTHER"]), content: z.string().min(10).max(2000), path: z.string().min(1).max(500).nullable().optional(), imageIds: z.array(z.uuid()).min(0).max(5).nullable().optional() });

export type AdminLoginRequest = __TypedOpenapi.Schemas.AdminLoginRequest;
export const AdminLoginRequest = z.object({ username: z.string().min(1).regex(new RegExp(".*\\S.*")), password: z.string().min(1).regex(new RegExp(".*\\S.*")) });

export type AdminProductRequestStatusUpdateRequest = __TypedOpenapi.Schemas.AdminProductRequestStatusUpdateRequest;
export const AdminProductRequestStatusUpdateRequest = z.object({ status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]) });

export type AdminProductRequestResponse = __TypedOpenapi.Schemas.AdminProductRequestResponse;
export const AdminProductRequestResponse = z.object({ requestId: z.uuid(), productName: z.string(), brandName: z.string().nullable(), requestedAt: z.iso.datetime({ offset: true }), status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]), statusChangedAt: z.iso.datetime({ offset: true }), completedAt: z.iso.datetime({ offset: true }).nullable() });

export type AdminFeedbackStatusUpdateRequest = __TypedOpenapi.Schemas.AdminFeedbackStatusUpdateRequest;
export const AdminFeedbackStatusUpdateRequest = z.object({ status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]) });

export type AdminFeedbackImageResponse = __TypedOpenapi.Schemas.AdminFeedbackImageResponse;
export const AdminFeedbackImageResponse = z.object({ imageId: z.uuid(), extension: z.string() });

export type AdminFeedbackResponse = __TypedOpenapi.Schemas.AdminFeedbackResponse;
export const AdminFeedbackResponse = z.object({ feedbackId: z.uuid(), type: z.enum(["BUG_REPORT", "IMPROVEMENT", "OTHER", "PRODUCT_CORRECTION"]), content: z.string(), path: z.string().nullable(), productId: z.number().int().nullable(), productName: z.string().nullable(), receivedAt: z.iso.datetime({ offset: true }), status: z.enum(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]), statusChangedAt: z.iso.datetime({ offset: true }), completedAt: z.iso.datetime({ offset: true }).nullable(), images: z.array(AdminFeedbackImageResponse) });

export type BrandResponse = __TypedOpenapi.Schemas.BrandResponse;
export const BrandResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string().nullable(), imageUrl: z.string().nullable() });

export type ProductResponse = __TypedOpenapi.Schemas.ProductResponse;
export const ProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3) });

export type StorageResponse = __TypedOpenapi.Schemas.StorageResponse;
export const StorageResponse = z.object({ items: z.array(ProductResponse) });

export type SkinTypeResponse = __TypedOpenapi.Schemas.SkinTypeResponse;
export const SkinTypeResponse = z.object({ code: z.enum(["DRY", "OILY", "SENSITIVE", "COMBINATION"]), name: z.string() });

export type SkinTypesResponse = __TypedOpenapi.Schemas.SkinTypesResponse;
export const SkinTypesResponse = z.object({ items: z.array(SkinTypeResponse) });

export type RankingChangeItem = __TypedOpenapi.Schemas.RankingChangeItem;
export const RankingChangeItem = z.object({ movement: z.string(), steps: z.number().int() });

export type RankingItem = __TypedOpenapi.Schemas.RankingItem;
export const RankingItem = z.object({ rank: z.number().int(), keyword: z.string(), change: RankingChangeItem.optional() });

export type RankingsResponse = __TypedOpenapi.Schemas.RankingsResponse;
export const RankingsResponse = z.object({ items: z.array(RankingItem) });

export type CategoryChildResponse = __TypedOpenapi.Schemas.CategoryChildResponse;
export const CategoryChildResponse = z.object({ id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryResponse = __TypedOpenapi.Schemas.CategoryResponse;
export const CategoryResponse = z.object({ id: z.number().int(), name: z.string(), children: z.array(CategoryChildResponse), productCount: z.number().int() });

export type PaginationResponse = __TypedOpenapi.Schemas.PaginationResponse;
export const PaginationResponse = z.object({ page: z.number().int(), size: z.number().int(), totalElements: z.number().int(), totalPages: z.number().int(), hasNext: z.boolean() });

export type ProductPageResponse = __TypedOpenapi.Schemas.ProductPageResponse;
export const ProductPageResponse = z.object({ items: z.array(ProductResponse), pagination: PaginationResponse, brands: z.array(BrandResponse), categories: z.array(CategoryResponse), skinTypes: z.array(SkinTypeResponse) });

export type CategorySummaryResponse = __TypedOpenapi.Schemas.CategorySummaryResponse;
export const CategorySummaryResponse = z.object({ id: z.number().int(), name: z.string() });

export type CategoryPathResponse = __TypedOpenapi.Schemas.CategoryPathResponse;
export const CategoryPathResponse = z.object({ id: z.number().int(), name: z.string(), child: CategorySummaryResponse });

export type DisclosedAmountResponse = __TypedOpenapi.Schemas.DisclosedAmountResponse;
export const DisclosedAmountResponse = z.object({ type: z.string(), value: z.number(), unit: z.string() });

export type FormulationRoleResponse = __TypedOpenapi.Schemas.FormulationRoleResponse;
export const FormulationRoleResponse = z.object({ id: z.number().int(), code: z.string(), name: z.string() });

export type ProductVariantResponse = __TypedOpenapi.Schemas.ProductVariantResponse;
export const ProductVariantResponse = z.object({ id: z.number().int(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), status: z.string() });

export type SkinEffectGroupResponse = __TypedOpenapi.Schemas.SkinEffectGroupResponse;
export const SkinEffectGroupResponse = z.object({ id: z.number().int(), code: z.string(), name: z.string(), ingredientIds: z.array(z.number().int()) });

export type SkinEffectResponse = __TypedOpenapi.Schemas.SkinEffectResponse;
export const SkinEffectResponse = z.object({ id: z.number().int(), code: z.string(), name: z.string() });

export type ProductIngredientResponse = __TypedOpenapi.Schemas.ProductIngredientResponse;
export const ProductIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), disclosedAmount: DisclosedAmountResponse.optional() });

export type ProductDetailResponse = __TypedOpenapi.Schemas.ProductDetailResponse;
export const ProductDetailResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, categories: z.array(CategoryPathResponse), imageUrl: z.string(), variants: z.array(ProductVariantResponse), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3), skinEffectGroups: z.array(SkinEffectGroupResponse), ingredients: z.array(ProductIngredientResponse), freeOfCodes: z.array(z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"])), updatedAt: z.iso.datetime({ offset: true }) });

export type ProductSuggestionMatchResponse = __TypedOpenapi.Schemas.ProductSuggestionMatchResponse;
export const ProductSuggestionMatchResponse = z.object({ field: z.enum(["PRODUCT_NAME", "BRAND_NAME"]), text: z.string(), startIndex: z.number().int().min(0), endIndexExclusive: z.number().int().min(0) });

export type ProductSuggestionResponse = __TypedOpenapi.Schemas.ProductSuggestionResponse;
export const ProductSuggestionResponse = z.object({ id: z.number().int(), name: z.string(), imageUrl: z.string(), brandName: z.string(), match: ProductSuggestionMatchResponse });

export type ProductSuggestionPageResponse = __TypedOpenapi.Schemas.ProductSuggestionPageResponse;
export const ProductSuggestionPageResponse = z.object({ items: z.array(ProductSuggestionResponse), pagination: PaginationResponse });

export type ShareMatchResponse = __TypedOpenapi.Schemas.ShareMatchResponse;
export const ShareMatchResponse = z.object({ status: z.enum(["MATCHED", "NOT_FOUND"]), productId: z.number().int().nullable().optional(), keyword: z.string().nullable().optional() });

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
export const IngredientDetailResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), description: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), groupCodes: z.array(z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"])), productCount: z.number().int(), infoSources: z.array(z.string()), effectSources: z.array(z.string()), updatedAt: z.iso.datetime({ offset: true }) });

export type IngredientSuggestionMatchResponse = __TypedOpenapi.Schemas.IngredientSuggestionMatchResponse;
export const IngredientSuggestionMatchResponse = z.object({ field: z.enum(["KOREAN_NAME", "ENGLISH_NAME", "ALIAS"]), text: z.string(), startIndex: z.number().int().min(0), endIndexExclusive: z.number().int().min(0) });

export type IngredientSuggestionResponse = __TypedOpenapi.Schemas.IngredientSuggestionResponse;
export const IngredientSuggestionResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), skinEffects: z.array(SkinEffectResponse), match: IngredientSuggestionMatchResponse });

export type IngredientListResponse = __TypedOpenapi.Schemas.IngredientListResponse;
export const IngredientListResponse = z.object({ items: z.array(IngredientSuggestionResponse) });

export type IngredientSummaryResponse = __TypedOpenapi.Schemas.IngredientSummaryResponse;
export const IngredientSummaryResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string() });

export type ExcludeCodeResponse = __TypedOpenapi.Schemas.ExcludeCodeResponse;
export const ExcludeCodeResponse = z.object({ code: z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"]), name: z.string(), description: z.string(), ingredients: z.array(IngredientSummaryResponse) });

export type ExcludeCodeListResponse = __TypedOpenapi.Schemas.ExcludeCodeListResponse;
export const ExcludeCodeListResponse = z.object({ items: z.array(ExcludeCodeResponse) });

export type CurationSummaryResponse = __TypedOpenapi.Schemas.CurationSummaryResponse;
export const CurationSummaryResponse = z.object({ id: z.number().int(), slug: z.string().regex(new RegExp("^[a-z0-9-]+$")), title: z.string(), description: z.string(), thumbnailImageUrl: z.string() });

export type CurationListResponse = __TypedOpenapi.Schemas.CurationListResponse;
export const CurationListResponse = z.object({ items: z.array(CurationSummaryResponse) });

export type CurationImageBlockResponse = __TypedOpenapi.Schemas.CurationImageBlockResponse;
export const CurationImageBlockResponse = z.object({ id: z.uuid(), type: z.literal("IMAGE"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), imageUrl: z.string() });

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

export type ProblemDetail = __TypedOpenapi.Schemas.ProblemDetail;
export const ProblemDetail = z.object({ type: z.url().optional(), title: z.string(), status: z.number().int(), detail: z.string(), instance: z.string().optional(), code: z.enum(["INVALID_QUERY_PARAMETER", "INVALID_REQUEST_BODY", "INVALID_FEEDBACK_IMAGE", "INVALID_FEEDBACK_IMAGE_ID", "CONFLICTING_INGREDIENT_FILTER", "PAYLOAD_TOO_LARGE", "TOO_MANY_REQUESTS", "UNSUPPORTED_REQUEST", "FEEDBACK_NOT_FOUND", "PRODUCT_REQUEST_NOT_FOUND", "CURATION_NOT_FOUND", "PRODUCT_NOT_FOUND", "BRAND_NOT_FOUND", "INGREDIENT_NOT_FOUND", "ENDPOINT_NOT_FOUND", "INTERNAL_SERVER_ERROR"]) });

// </Schemas>
