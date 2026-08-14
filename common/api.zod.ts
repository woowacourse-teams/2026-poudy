// @ts-nocheck
import type * as __TypedOpenapi from "./api.zod.types.js";

  import { z } from "zod";

// <Schemas>
export type BrandResponse = __TypedOpenapi.Schemas.BrandResponse;
export const BrandResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string(), imageUrl: z.string() });

export type ProductResponse = __TypedOpenapi.Schemas.ProductResponse;
export const ProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3) });

export type StorageResponse = __TypedOpenapi.Schemas.StorageResponse;
export const StorageResponse = z.object({ items: z.array(ProductResponse) });

export type PaginationResponse = __TypedOpenapi.Schemas.PaginationResponse;
export const PaginationResponse = z.object({ page: z.number().int(), size: z.number().int(), totalElements: z.number().int(), totalPages: z.number().int(), hasNext: z.boolean() });

export type ProductPageResponse = __TypedOpenapi.Schemas.ProductPageResponse;
export const ProductPageResponse = z.object({ items: z.array(ProductResponse), pagination: PaginationResponse, brands: z.array(BrandResponse) });

export type BenefitResponse = __TypedOpenapi.Schemas.BenefitResponse;
export const BenefitResponse = z.object({ id: z.number().int(), name: z.string(), color: z.string(), ingredientIds: z.array(z.number().int()) });

export type CategorySummaryResponse = __TypedOpenapi.Schemas.CategorySummaryResponse;
export const CategorySummaryResponse = z.object({ id: z.number().int(), name: z.string() });

export type CategoryPathResponse = __TypedOpenapi.Schemas.CategoryPathResponse;
export const CategoryPathResponse = z.object({ id: z.number().int(), name: z.string(), child: CategorySummaryResponse.optional() });

export type DisclosedAmountResponse = __TypedOpenapi.Schemas.DisclosedAmountResponse;
export const DisclosedAmountResponse = z.object({ type: z.string(), value: z.number(), unit: z.string() });

export type EffectResponse = __TypedOpenapi.Schemas.EffectResponse;
export const EffectResponse = z.object({ id: z.number().int(), name: z.string(), color: z.string() });

export type ProductVariantResponse = __TypedOpenapi.Schemas.ProductVariantResponse;
export const ProductVariantResponse = z.object({ id: z.number().int(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), status: z.string() });

export type ProductIngredientResponse = __TypedOpenapi.Schemas.ProductIngredientResponse;
export const ProductIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), effects: z.array(EffectResponse), disclosedAmount: DisclosedAmountResponse.optional() });

export type ProductDetailResponse = __TypedOpenapi.Schemas.ProductDetailResponse;
export const ProductDetailResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, categories: z.array(CategoryPathResponse), imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), variants: z.array(ProductVariantResponse), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3), benefits: z.array(BenefitResponse), ingredients: z.array(ProductIngredientResponse), freeOfCodes: z.array(z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"])) });

export type ProductCountResponse = __TypedOpenapi.Schemas.ProductCountResponse;
export const ProductCountResponse = z.object({ count: z.number().int() });

export type IngredientResponse = __TypedOpenapi.Schemas.IngredientResponse;
export const IngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), effects: z.array(EffectResponse) });

export type IngredientSummaryResponse = __TypedOpenapi.Schemas.IngredientSummaryResponse;
export const IngredientSummaryResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string() });

export type IngredientSuggestionResponse = __TypedOpenapi.Schemas.IngredientSuggestionResponse;
export const IngredientSuggestionResponse = z.object({ items: z.array(IngredientSummaryResponse) });

export type IngredientDetailResponse = __TypedOpenapi.Schemas.IngredientDetailResponse;
export const IngredientDetailResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), description: z.string(), effects: z.array(EffectResponse), groupCodes: z.array(z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"])), productCount: z.number().int(), infoSources: z.array(z.string()), effectSources: z.array(z.string()), relatedIngredients: z.array(IngredientSummaryResponse), updatedAt: z.iso.datetime({ offset: true }) });

export type ExcludeCodeResponse = __TypedOpenapi.Schemas.ExcludeCodeResponse;
export const ExcludeCodeResponse = z.object({ code: z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"]), name: z.string(), ingredients: z.array(IngredientSummaryResponse) });

export type ExcludeCodeListResponse = __TypedOpenapi.Schemas.ExcludeCodeListResponse;
export const ExcludeCodeListResponse = z.object({ items: z.array(ExcludeCodeResponse) });

export type CategoryChildResponse = __TypedOpenapi.Schemas.CategoryChildResponse;
export const CategoryChildResponse = z.object({ id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryResponse = __TypedOpenapi.Schemas.CategoryResponse;
export const CategoryResponse = z.object({ id: z.number().int(), name: z.string(), children: z.array(CategoryChildResponse), productCount: z.number().int() });

export type CategoryListResponse = __TypedOpenapi.Schemas.CategoryListResponse;
export const CategoryListResponse = z.object({ items: z.array(CategoryResponse) });

export type BrandListResponse = __TypedOpenapi.Schemas.BrandListResponse;
export const BrandListResponse = z.object({ items: z.array(BrandResponse) });

export type BrandDetailResponse = __TypedOpenapi.Schemas.BrandDetailResponse;
export const BrandDetailResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string(), imageUrl: z.string(), categories: z.array(CategoryResponse) });

export type ProblemDetail = __TypedOpenapi.Schemas.ProblemDetail;
export const ProblemDetail = z.object({ type: z.url().optional(), title: z.string(), status: z.number().int(), detail: z.string(), instance: z.string().optional(), code: z.enum(["INVALID_QUERY_PARAMETER", "CONFLICTING_INGREDIENT_FILTER", "CONFLICTING_SEARCH_AND_FILTER", "UNSUPPORTED_REQUEST", "PRODUCT_NOT_FOUND", "BRAND_NOT_FOUND", "INGREDIENT_NOT_FOUND", "ENDPOINT_NOT_FOUND", "INTERNAL_SERVER_ERROR"]) });

// </Schemas>
