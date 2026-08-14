// @ts-nocheck
import type * as __TypedOpenapi from "./api.zod.types.js";

  import { z } from "zod";

// <Schemas>
export type BrandSummaryResponse = __TypedOpenapi.Schemas.BrandSummaryResponse;
export const BrandSummaryResponse = z.object({ id: z.number().int(), name: z.string(), logoUrl: z.string() });

export type PaginationResponse = __TypedOpenapi.Schemas.PaginationResponse;
export const PaginationResponse = z.object({ page: z.number().int(), size: z.number().int(), totalElements: z.number().int(), totalPages: z.number().int(), hasNext: z.boolean() });

export type ProductResponse = __TypedOpenapi.Schemas.ProductResponse;
export const ProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandSummaryResponse, imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string() });

export type ProductPageResponse = __TypedOpenapi.Schemas.ProductPageResponse;
export const ProductPageResponse = z.object({ items: z.array(ProductResponse), pagination: PaginationResponse });

export type BenefitResponse = __TypedOpenapi.Schemas.BenefitResponse;
export const BenefitResponse = z.object({ id: z.number().int(), name: z.string(), color: z.string(), ingredientIds: z.array(z.number().int()) });

export type CategorySummaryResponse = __TypedOpenapi.Schemas.CategorySummaryResponse;
export const CategorySummaryResponse = z.object({ id: z.number().int(), name: z.string() });

export type CategoryPathResponse = __TypedOpenapi.Schemas.CategoryPathResponse;
export const CategoryPathResponse = z.object({ id: z.number().int(), name: z.string(), child: CategorySummaryResponse.optional() });

export type EffectResponse = __TypedOpenapi.Schemas.EffectResponse;
export const EffectResponse = z.object({ id: z.number().int(), name: z.string(), color: z.string() });

export type ProductIngredientResponse = __TypedOpenapi.Schemas.ProductIngredientResponse;
export const ProductIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), effects: z.array(EffectResponse) });

export type ProductDetailResponse = __TypedOpenapi.Schemas.ProductDetailResponse;
export const ProductDetailResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandSummaryResponse, categories: z.array(CategoryPathResponse), imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().int().min(0).max(3), oilLevel: z.number().int().min(0).max(3), benefits: z.array(BenefitResponse), ingredients: z.array(ProductIngredientResponse), freeOfCodes: z.array(z.enum(["SENSITIVE", "FRAGRANCE", "ETHANOL", "PARABEN_7", "MINERAL_OIL", "ALLERGEN"])) });

export type ProductCountResponse = __TypedOpenapi.Schemas.ProductCountResponse;
export const ProductCountResponse = z.object({ count: z.number().int() });

export type IngredientResponse = __TypedOpenapi.Schemas.IngredientResponse;
export const IngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), effects: z.array(EffectResponse) });

export type IngredientSummaryResponse = __TypedOpenapi.Schemas.IngredientSummaryResponse;
export const IngredientSummaryResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string() });

export type IngredientSuggestionResponse = __TypedOpenapi.Schemas.IngredientSuggestionResponse;
export const IngredientSuggestionResponse = z.object({ items: z.array(IngredientSummaryResponse) });

export type IngredientDetailResponse = __TypedOpenapi.Schemas.IngredientDetailResponse;
export const IngredientDetailResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), description: z.string(), effects: z.array(EffectResponse), groupCodes: z.array(z.enum(["SENSITIVE", "FRAGRANCE", "ETHANOL", "PARABEN_7", "MINERAL_OIL", "ALLERGEN"])), productCount: z.number().int(), infoSources: z.array(z.string()), effectSources: z.array(z.string()), relatedIngredients: z.array(IngredientSummaryResponse), updatedAt: z.iso.datetime({ offset: true }) });

export type CategoryChildResponse = __TypedOpenapi.Schemas.CategoryChildResponse;
export const CategoryChildResponse = z.object({ id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryResponse = __TypedOpenapi.Schemas.CategoryResponse;
export const CategoryResponse = z.object({ id: z.number().int(), name: z.string(), children: z.array(CategoryChildResponse), productCount: z.number().int() });

export type CategoryListResponse = __TypedOpenapi.Schemas.CategoryListResponse;
export const CategoryListResponse = z.object({ items: z.array(CategoryResponse) });

export type BrandResponse = __TypedOpenapi.Schemas.BrandResponse;
export const BrandResponse = z.object({ id: z.number().int(), name: z.string(), englishName: z.string(), logoUrl: z.string(), productCount: z.number().int() });

export type BrandListResponse = __TypedOpenapi.Schemas.BrandListResponse;
export const BrandListResponse = z.object({ items: z.array(BrandResponse) });

export type ProblemDetail = __TypedOpenapi.Schemas.ProblemDetail;
export const ProblemDetail = z.object({ type: z.url().optional(), title: z.string(), status: z.number().int(), detail: z.string(), instance: z.string().optional(), code: z.enum(["INVALID_QUERY_PARAMETER", "CONFLICTING_INGREDIENT_FILTER", "UNSUPPORTED_REQUEST", "PRODUCT_NOT_FOUND", "INGREDIENT_NOT_FOUND", "ENDPOINT_NOT_FOUND", "INTERNAL_SERVER_ERROR"]) });

// </Schemas>
