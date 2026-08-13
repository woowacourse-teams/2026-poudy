// @ts-nocheck
import type * as __TypedOpenapi from "./api.zod.types.js";

  import { z } from "zod";

// <Schemas>
export type BenefitResponse = __TypedOpenapi.Schemas.BenefitResponse;
export const BenefitResponse = z.object({ color: z.string(), id: z.number().int(), ingredientIds: z.array(z.number().int()), name: z.string() });

export type BrandResponse = __TypedOpenapi.Schemas.BrandResponse;
export const BrandResponse = z.object({ id: z.number().int(), logoUrl: z.string(), name: z.string(), productCount: z.number().int() });

export type BrandListResponse = __TypedOpenapi.Schemas.BrandListResponse;
export const BrandListResponse = z.object({ items: z.array(BrandResponse) });

export type BrandSummaryResponse = __TypedOpenapi.Schemas.BrandSummaryResponse;
export const BrandSummaryResponse = z.object({ id: z.number().int(), logoUrl: z.string(), name: z.string() });

export type CategoryChildResponse = __TypedOpenapi.Schemas.CategoryChildResponse;
export const CategoryChildResponse = z.object({ id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryResponse = __TypedOpenapi.Schemas.CategoryResponse;
export const CategoryResponse = z.object({ children: z.array(CategoryChildResponse), id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryListResponse = __TypedOpenapi.Schemas.CategoryListResponse;
export const CategoryListResponse = z.object({ items: z.array(CategoryResponse) });

export type CategorySummaryResponse = __TypedOpenapi.Schemas.CategorySummaryResponse;
export const CategorySummaryResponse = z.object({ id: z.number().int(), name: z.string() });

export type EffectResponse = __TypedOpenapi.Schemas.EffectResponse;
export const EffectResponse = z.object({ color: z.string(), id: z.number().int(), name: z.string() });

export type IngredientSummaryResponse = __TypedOpenapi.Schemas.IngredientSummaryResponse;
export const IngredientSummaryResponse = z.object({ englishName: z.string(), id: z.number().int(), koreanName: z.string() });

export type IngredientDetailResponse = __TypedOpenapi.Schemas.IngredientDetailResponse;
export const IngredientDetailResponse = z.object({ description: z.string(), effectSources: z.array(z.string()), effects: z.array(EffectResponse), englishName: z.string(), groupCodes: z.array(z.enum(["SENSITIVE", "FRAGRANCE", "ETHANOL", "PARABEN_7", "MINERAL_OIL", "ALLERGEN"])), id: z.number().int(), infoSources: z.array(z.string()), koreanName: z.string(), productCount: z.number().int(), relatedIngredients: z.array(IngredientSummaryResponse), updatedAt: z.iso.datetime({ offset: true }) });

export type IngredientResponse = __TypedOpenapi.Schemas.IngredientResponse;
export const IngredientResponse = z.object({ effects: z.array(EffectResponse), englishName: z.string(), groupCodes: z.array(z.enum(["SENSITIVE", "FRAGRANCE", "ETHANOL", "PARABEN_7", "MINERAL_OIL", "ALLERGEN"])), id: z.number().int(), koreanName: z.string() });

export type IngredientListResponse = __TypedOpenapi.Schemas.IngredientListResponse;
export const IngredientListResponse = z.object({ items: z.array(IngredientResponse) });

export type PaginationResponse = __TypedOpenapi.Schemas.PaginationResponse;
export const PaginationResponse = z.object({ hasNext: z.boolean(), page: z.number().int(), size: z.number().int(), totalElements: z.number().int(), totalPages: z.number().int() });

export type ProblemDetail = __TypedOpenapi.Schemas.ProblemDetail;
export const ProblemDetail = z.object({ code: z.enum(["INVALID_QUERY_PARAMETER", "CONFLICTING_INGREDIENT_FILTER", "UNSUPPORTED_REQUEST", "PRODUCT_NOT_FOUND", "BRAND_NOT_FOUND", "INGREDIENT_NOT_FOUND", "ENDPOINT_NOT_FOUND", "INTERNAL_SERVER_ERROR"]), detail: z.string(), instance: z.string().optional(), status: z.number().int(), title: z.string(), type: z.url().optional() });

export type ProductCountResponse = __TypedOpenapi.Schemas.ProductCountResponse;
export const ProductCountResponse = z.object({ count: z.number().int() });

export type ProductIngredientResponse = __TypedOpenapi.Schemas.ProductIngredientResponse;
export const ProductIngredientResponse = z.object({ effects: z.array(EffectResponse), englishName: z.string(), id: z.number().int(), koreanName: z.string() });

export type ProductDetailResponse = __TypedOpenapi.Schemas.ProductDetailResponse;
export const ProductDetailResponse = z.object({ benefits: z.array(BenefitResponse), brand: BrandSummaryResponse, categories: z.array(CategorySummaryResponse), freeOfCodes: z.array(z.enum(["SENSITIVE", "FRAGRANCE", "ETHANOL", "PARABEN_7", "MINERAL_OIL", "ALLERGEN"])), id: z.number().int(), imageUrl: z.string(), ingredients: z.array(ProductIngredientResponse), moistureLevel: z.number().int().min(0).max(3), name: z.string(), oilLevel: z.number().int().min(0).max(3), price: z.number().int(), volumeUnit: z.string(), volumeValue: z.number() });

export type ProductResponse = __TypedOpenapi.Schemas.ProductResponse;
export const ProductResponse = z.object({ brand: BrandSummaryResponse, id: z.number().int(), imageUrl: z.string(), name: z.string(), price: z.number().int(), volumeUnit: z.string(), volumeValue: z.number() });

export type ProductPageResponse = __TypedOpenapi.Schemas.ProductPageResponse;
export const ProductPageResponse = z.object({ items: z.array(ProductResponse), pagination: PaginationResponse });

// </Schemas>
