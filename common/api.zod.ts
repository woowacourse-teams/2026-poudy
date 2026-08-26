// @ts-nocheck
import type * as __TypedOpenapi from "./api.zod.types.js";

  import { z } from "zod";

// <Schemas>
export type ProductRegistrationRequest = __TypedOpenapi.Schemas.ProductRegistrationRequest;
export const ProductRegistrationRequest = z.object({ productName: z.string().min(1).max(200), brandName: z.string().min(0).max(100).nullable().optional() });

export type FeedbackRequest = __TypedOpenapi.Schemas.FeedbackRequest;
export const FeedbackRequest = z.object({ type: z.enum(["BUG_REPORT", "DATA_CORRECTION", "IMPROVEMENT", "OTHER"]), content: z.string().min(10).max(2000), path: z.string().min(1).max(500), imageIds: z.array(z.uuid()).min(0).max(5).nullable().optional() });

export type FeedbackImageUploadResponse = __TypedOpenapi.Schemas.FeedbackImageUploadResponse;
export const FeedbackImageUploadResponse = z.object({ imageIds: z.array(z.uuid()).min(1).max(5) });

export type BrandResponse = __TypedOpenapi.Schemas.BrandResponse;
export const BrandResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string().nullable(), imageUrl: z.string().nullable() });

export type ProductResponse = __TypedOpenapi.Schemas.ProductResponse;
export const ProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3) });

export type StorageResponse = __TypedOpenapi.Schemas.StorageResponse;
export const StorageResponse = z.object({ items: z.array(ProductResponse) });

export type PaginationResponse = __TypedOpenapi.Schemas.PaginationResponse;
export const PaginationResponse = z.object({ page: z.number().int(), size: z.number().int(), totalElements: z.number().int(), totalPages: z.number().int(), hasNext: z.boolean() });

export type ProductPageResponse = __TypedOpenapi.Schemas.ProductPageResponse;
export const ProductPageResponse = z.object({ items: z.array(ProductResponse), pagination: PaginationResponse, brands: z.array(BrandResponse) });

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

export type ProductSuggestionResponse = __TypedOpenapi.Schemas.ProductSuggestionResponse;
export const ProductSuggestionResponse = z.object({ id: z.number().int(), name: z.string(), imageUrl: z.string(), brandName: z.string() });

export type ProductSuggestionPageResponse = __TypedOpenapi.Schemas.ProductSuggestionPageResponse;
export const ProductSuggestionPageResponse = z.object({ items: z.array(ProductSuggestionResponse), pagination: PaginationResponse });

export type ShareMatchResponse = __TypedOpenapi.Schemas.ShareMatchResponse;
export const ShareMatchResponse = z.object({ status: z.enum(["MATCHED", "NOT_FOUND"]), productId: z.number().int().nullable().optional(), keyword: z.string().nullable().optional() });

export type ProductCountResponse = __TypedOpenapi.Schemas.ProductCountResponse;
export const ProductCountResponse = z.object({ count: z.number().int() });

export type IngredientResponse = __TypedOpenapi.Schemas.IngredientResponse;
export const IngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), skinEffects: z.array(SkinEffectResponse) });

export type IngredientListResponse = __TypedOpenapi.Schemas.IngredientListResponse;
export const IngredientListResponse = z.object({ items: z.array(IngredientResponse) });

export type IngredientDetailResponse = __TypedOpenapi.Schemas.IngredientDetailResponse;
export const IngredientDetailResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), description: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), groupCodes: z.array(z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"])), productCount: z.number().int(), infoSources: z.array(z.string()), effectSources: z.array(z.string()), updatedAt: z.iso.datetime({ offset: true }) });

export type IngredientSummaryResponse = __TypedOpenapi.Schemas.IngredientSummaryResponse;
export const IngredientSummaryResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string() });

export type ExcludeCodeResponse = __TypedOpenapi.Schemas.ExcludeCodeResponse;
export const ExcludeCodeResponse = z.object({ code: z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"]), name: z.string(), description: z.string(), ingredients: z.array(IngredientSummaryResponse) });

export type ExcludeCodeListResponse = __TypedOpenapi.Schemas.ExcludeCodeListResponse;
export const ExcludeCodeListResponse = z.object({ items: z.array(ExcludeCodeResponse) });

export type CategoryChildResponse = __TypedOpenapi.Schemas.CategoryChildResponse;
export const CategoryChildResponse = z.object({ id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryResponse = __TypedOpenapi.Schemas.CategoryResponse;
export const CategoryResponse = z.object({ id: z.number().int(), name: z.string(), children: z.array(CategoryChildResponse), productCount: z.number().int() });

export type CategoryListResponse = __TypedOpenapi.Schemas.CategoryListResponse;
export const CategoryListResponse = z.object({ items: z.array(CategoryResponse) });

export type BrandSummaryResponse = __TypedOpenapi.Schemas.BrandSummaryResponse;
export const BrandSummaryResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string().nullable(), imageUrl: z.string().nullable(), productCount: z.number().int() });

export type BrandOverviewResponse = __TypedOpenapi.Schemas.BrandOverviewResponse;
export const BrandOverviewResponse = z.object({ items: z.array(BrandSummaryResponse) });

export type BrandDetailResponse = __TypedOpenapi.Schemas.BrandDetailResponse;
export const BrandDetailResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string().nullable(), imageUrl: z.string().nullable(), categories: z.array(CategoryResponse) });

export type ProblemDetail = __TypedOpenapi.Schemas.ProblemDetail;
export const ProblemDetail = z.object({ type: z.url().optional(), title: z.string(), status: z.number().int(), detail: z.string(), instance: z.string().optional(), code: z.enum(["INVALID_QUERY_PARAMETER", "INVALID_REQUEST_BODY", "INVALID_FEEDBACK_IMAGE", "INVALID_FEEDBACK_IMAGE_ID", "CONFLICTING_INGREDIENT_FILTER", "PAYLOAD_TOO_LARGE", "TOO_MANY_REQUESTS", "UNSUPPORTED_REQUEST", "PRODUCT_NOT_FOUND", "BRAND_NOT_FOUND", "INGREDIENT_NOT_FOUND", "ENDPOINT_NOT_FOUND", "INTERNAL_SERVER_ERROR"]) });

// </Schemas>
