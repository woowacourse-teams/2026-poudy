// @ts-nocheck
import type * as __TypedOpenapi from "./api.zod.types.js";

  import { z } from "zod";

// <Schemas>
export type RatingPreference = __TypedOpenapi.Schemas.RatingPreference;
export const RatingPreference = z.enum(["GOOD", "BAD"]);

export type ShelfUsageStatus = __TypedOpenapi.Schemas.ShelfUsageStatus;
export const ShelfUsageStatus = z.enum(["IN_USE", "USED"]);

export type ShelfProductUpdateRequest = __TypedOpenapi.Schemas.ShelfProductUpdateRequest;
export const ShelfProductUpdateRequest = z.object({ usageStatus: ShelfUsageStatus, preference: RatingPreference.nullable().optional(), moistureLevel: z.number().nullable().optional(), oilLevel: z.number().nullable().optional() });

export type MarkResponse = __TypedOpenapi.Schemas.MarkResponse;
export const MarkResponse = z.object({ code: z.string(), name: z.string() });

export type RatingResponse = __TypedOpenapi.Schemas.RatingResponse;
export const RatingResponse = z.object({ preference: RatingPreference.nullable(), moistureLevel: z.number().nullable(), oilLevel: z.number().nullable() });

export type ShelfProductInfoResponse = __TypedOpenapi.Schemas.ShelfProductInfoResponse;
export const ShelfProductInfoResponse = z.object({ id: z.number().int(), name: z.string(), brandName: z.string(), marks: z.array(MarkResponse), imageUrl: z.string(), sensorySupported: z.boolean() });

export type ShelfProductResponse = __TypedOpenapi.Schemas.ShelfProductResponse;
export const ShelfProductResponse = z.object({ product: ShelfProductInfoResponse, usageStatus: ShelfUsageStatus, rating: RatingResponse, possiblyUnsuitable: z.boolean(), registeredAt: z.iso.datetime({ offset: true }) });

export type PushTokenEnabledRequest = __TypedOpenapi.Schemas.PushTokenEnabledRequest;
export const PushTokenEnabledRequest = z.object({ token: z.string().min(0).max(255).regex(new RegExp("^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$")), enabled: z.boolean() });

export type NoticeStatus = __TypedOpenapi.Schemas.NoticeStatus;
export const NoticeStatus = z.enum(["PRIVATE", "PUBLISHED"]);

export type AdminNoticeEditRequest = __TypedOpenapi.Schemas.AdminNoticeEditRequest;
export const AdminNoticeEditRequest = z.object({ title: z.string().min(1).max(40), content: z.string().min(1).max(2000), status: NoticeStatus, bannerEnabled: z.boolean(), bannerText: z.string().max(24).nullable().optional(), imageIds: z.array(z.uuid()).min(0).max(5) });

export type NoticeImageResponse = __TypedOpenapi.Schemas.NoticeImageResponse;
export const NoticeImageResponse = z.object({ imageId: z.uuid() });

export type NoticeResponse = __TypedOpenapi.Schemas.NoticeResponse;
export const NoticeResponse = z.object({ id: z.uuid(), title: z.string(), content: z.string(), authorName: z.string(), status: NoticeStatus, bannerEnabled: z.boolean(), bannerText: z.string().nullable(), firstPublishedAt: z.iso.datetime({ offset: true }).nullable(), viewCount: z.number().int(), createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }), images: z.array(NoticeImageResponse) });

export type SkinFilterIngredientsRequest = __TypedOpenapi.Schemas.SkinFilterIngredientsRequest;
export const SkinFilterIngredientsRequest = z.object({ ingredientIds: z.array(z.number().int()).min(1).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }) });

export type ShelfProductAddRequest = __TypedOpenapi.Schemas.ShelfProductAddRequest;
export const ShelfProductAddRequest = z.object({ productId: z.number().int(), usageStatus: ShelfUsageStatus, preference: RatingPreference.nullable().optional(), moistureLevel: z.number().nullable().optional(), oilLevel: z.number().nullable().optional() });

export type SearchKeywordRequest = __TypedOpenapi.Schemas.SearchKeywordRequest;
export const SearchKeywordRequest = z.object({ keyword: z.string().min(1).max(100) });

export type PushTokenRequest = __TypedOpenapi.Schemas.PushTokenRequest;
export const PushTokenRequest = z.object({ token: z.string().min(0).max(255).regex(new RegExp("^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$")) });

export type PushTokenResponse = __TypedOpenapi.Schemas.PushTokenResponse;
export const PushTokenResponse = z.object({ enabled: z.boolean() });

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

export type AppLoginRequest = __TypedOpenapi.Schemas.AppLoginRequest;
export const AppLoginRequest = z.object({ token: z.string().min(1) });

export type LoginStatus = __TypedOpenapi.Schemas.LoginStatus;
export const LoginStatus = z.enum(["SIGNED_IN", "WITHDRAWN", "RESTORE_REQUESTED", "SIGNUP_REQUIRED"]);

export type AppLoginResponse = __TypedOpenapi.Schemas.AppLoginResponse;
export const AppLoginResponse = z.object({ status: LoginStatus });

export type NoticeImageUploadResponse = __TypedOpenapi.Schemas.NoticeImageUploadResponse;
export const NoticeImageUploadResponse = z.object({ imageIds: z.array(z.uuid()) });

export type AdminLoginRequest = __TypedOpenapi.Schemas.AdminLoginRequest;
export const AdminLoginRequest = z.object({ username: z.string().min(1).regex(new RegExp(".*\\S.*")), password: z.string().min(1).regex(new RegExp(".*\\S.*")) });

export type InquiryKind = __TypedOpenapi.Schemas.InquiryKind;
export const InquiryKind = z.enum(["FEEDBACK", "PRODUCT_CORRECTION", "PRODUCT_REGISTRATION"]);

export type MemoRequest = __TypedOpenapi.Schemas.MemoRequest;
export const MemoRequest = z.object({ content: z.string().min(1) });

export type AgeRange = __TypedOpenapi.Schemas.AgeRange;
export const AgeRange = z.enum(["TEENS", "TWENTIES", "THIRTIES", "FORTIES", "FIFTIES", "SIXTIES_OR_OLDER"]);

export type Gender = __TypedOpenapi.Schemas.Gender;
export const Gender = z.enum(["FEMALE", "MALE"]);

export type SkinType = __TypedOpenapi.Schemas.SkinType;
export const SkinType = z.enum(["DRY", "OILY", "COMBINATION"]);

export type UserProfileRequest = __TypedOpenapi.Schemas.UserProfileRequest;
export const UserProfileRequest = z.object({ gender: Gender.nullable(), ageRange: AgeRange.nullable(), skinType: SkinType.nullable(), sensitiveSkin: z.boolean().nullable() });

export type OAuthProvider = __TypedOpenapi.Schemas.OAuthProvider;
export const OAuthProvider = z.enum(["KAKAO", "GOOGLE"]);

export type UserResponse = __TypedOpenapi.Schemas.UserResponse;
export const UserResponse = z.object({ id: z.number().int(), provider: OAuthProvider, email: z.string(), gender: Gender.nullable(), ageRange: AgeRange.nullable(), skinType: SkinType.nullable(), sensitiveSkin: z.boolean().nullable() });

export type ProductRequestStatus = __TypedOpenapi.Schemas.ProductRequestStatus;
export const ProductRequestStatus = z.enum(["RECEIVED", "IN_PROGRESS", "REVIEW_PLANNED", "COMPLETED", "REJECTED"]);

export type AdminProductRequestStatusUpdateRequest = __TypedOpenapi.Schemas.AdminProductRequestStatusUpdateRequest;
export const AdminProductRequestStatusUpdateRequest = z.object({ status: ProductRequestStatus });

export type AdminProductRequestResponse = __TypedOpenapi.Schemas.AdminProductRequestResponse;
export const AdminProductRequestResponse = z.object({ requestId: z.uuid(), productName: z.string(), brandName: z.string().nullable(), requestedAt: z.iso.datetime({ offset: true }), status: ProductRequestStatus, statusChangedAt: z.iso.datetime({ offset: true }), completedAt: z.iso.datetime({ offset: true }).nullable() });

export type FeedbackStatus = __TypedOpenapi.Schemas.FeedbackStatus;
export const FeedbackStatus = z.enum(["RECEIVED", "IN_PROGRESS", "REVIEW_PLANNED", "COMPLETED", "REJECTED"]);

export type Status = __TypedOpenapi.Schemas.Status;
export const Status = z.object({ status: FeedbackStatus });

export type Assignee = __TypedOpenapi.Schemas.Assignee;
export const Assignee = z.object({ assigned: z.boolean() });

export type AdminInquiryTarget = __TypedOpenapi.Schemas.AdminInquiryTarget;
export const AdminInquiryTarget = z.object({ kind: InquiryKind, id: z.uuid() });

export type BulkStatus = __TypedOpenapi.Schemas.BulkStatus;
export const BulkStatus = z.object({ targets: z.array(AdminInquiryTarget).min(1).max(100), status: FeedbackStatus });

export type BulkAssignee = __TypedOpenapi.Schemas.BulkAssignee;
export const BulkAssignee = z.object({ targets: z.array(AdminInquiryTarget).min(1).max(100), assigned: z.boolean() });

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
export const ProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, marks: z.array(MarkResponse), imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), oilLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), sensitiveSkin: z.boolean(), updatedAt: z.iso.datetime({ offset: true }) });

export type WishlistResponse = __TypedOpenapi.Schemas.WishlistResponse;
export const WishlistResponse = z.object({ items: z.array(ProductResponse) });

export type ExcludeCode = __TypedOpenapi.Schemas.ExcludeCode;
export const ExcludeCode = z.enum(["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS", "HARSH_PRESERVATIVES", "SULFATES", "CYCLIC_SILICONES", "SYNTHETIC_COLORANTS"]);

export type FormulationRoleResponse = __TypedOpenapi.Schemas.FormulationRoleResponse;
export const FormulationRoleResponse = z.object({ id: z.string(), code: z.string(), name: z.string() });

export type SkinEffectResponse = __TypedOpenapi.Schemas.SkinEffectResponse;
export const SkinEffectResponse = z.object({ id: z.string(), code: z.string(), name: z.string() });

export type SkinFilterIngredientResponse = __TypedOpenapi.Schemas.SkinFilterIngredientResponse;
export const SkinFilterIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), excludeCodes: z.array(ExcludeCode) });

export type SkinFilterResponse = __TypedOpenapi.Schemas.SkinFilterResponse;
export const SkinFilterResponse = z.object({ items: z.array(SkinFilterIngredientResponse) });

export type ShelfTab = __TypedOpenapi.Schemas.ShelfTab;
export const ShelfTab = z.enum(["ALL", "IN_USE", "USED"]);

export type ShelfUsageResponse = __TypedOpenapi.Schemas.ShelfUsageResponse;
export const ShelfUsageResponse = z.object({ code: ShelfTab, name: z.string(), count: z.number().int() });

export type ShelfResponse = __TypedOpenapi.Schemas.ShelfResponse;
export const ShelfResponse = z.object({ usages: z.array(ShelfUsageResponse), items: z.array(ShelfProductResponse) });

export type PaginationResponse = __TypedOpenapi.Schemas.PaginationResponse;
export const PaginationResponse = z.object({ page: z.number().int(), size: z.number().int(), totalElements: z.number().int(), totalPages: z.number().int(), hasNext: z.boolean() });

export type ProductMatchField = __TypedOpenapi.Schemas.ProductMatchField;
export const ProductMatchField = z.enum(["PRODUCT_NAME", "BRAND_NAME", "ATTRIBUTE_VALUE", "MARK"]);

export type ProductSuggestionMatchResponse = __TypedOpenapi.Schemas.ProductSuggestionMatchResponse;
export const ProductSuggestionMatchResponse = z.object({ field: ProductMatchField, text: z.string(), startIndex: z.number().int().min(0), endIndexExclusive: z.number().int().min(1) });

export type ProductSuggestionResponse = __TypedOpenapi.Schemas.ProductSuggestionResponse;
export const ProductSuggestionResponse = z.object({ id: z.number().int(), name: z.string(), brandName: z.string(), marks: z.array(MarkResponse), imageUrl: z.string(), match: ProductSuggestionMatchResponse });

export type ProductSuggestionPageResponse = __TypedOpenapi.Schemas.ProductSuggestionPageResponse;
export const ProductSuggestionPageResponse = z.object({ items: z.array(ProductSuggestionResponse), pagination: PaginationResponse });

export type IngredientAnalysisProductResponse = __TypedOpenapi.Schemas.IngredientAnalysisProductResponse;
export const IngredientAnalysisProductResponse = z.object({ id: z.number().int(), name: z.string(), imageUrl: z.string() });

export type IngredientAnalysisItemResponse = __TypedOpenapi.Schemas.IngredientAnalysisItemResponse;
export const IngredientAnalysisItemResponse = z.object({ id: z.number().int(), koreanName: z.string(), formulationRoles: z.array(FormulationRoleResponse), groupCodes: z.array(z.string()), products: z.array(IngredientAnalysisProductResponse), inFilter: z.boolean(), isNew: z.boolean() });

export type IngredientAnalysisResponse = __TypedOpenapi.Schemas.IngredientAnalysisResponse;
export const IngredientAnalysisResponse = z.object({ badProductCount: z.number().int(), items: z.array(IngredientAnalysisItemResponse) });

export type UnsuitableIngredientResponse = __TypedOpenapi.Schemas.UnsuitableIngredientResponse;
export const UnsuitableIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse) });

export type UserSimilarProductResponse = __TypedOpenapi.Schemas.UserSimilarProductResponse;
export const UserSimilarProductResponse = z.object({ id: z.number().int(), containsSkinFilterIngredient: z.boolean() });

export type UserProductResponse = __TypedOpenapi.Schemas.UserProductResponse;
export const UserProductResponse = z.object({ wishlisted: z.boolean(), shelved: z.boolean(), skinFilterEmpty: z.boolean(), unsuitableIngredients: z.array(UnsuitableIngredientResponse), similarProducts: z.array(UserSimilarProductResponse) });

export type SkinTypeResponse = __TypedOpenapi.Schemas.SkinTypeResponse;
export const SkinTypeResponse = z.object({ code: SkinType, name: z.string() });

export type SkinTypesResponse = __TypedOpenapi.Schemas.SkinTypesResponse;
export const SkinTypesResponse = z.object({ items: z.array(SkinTypeResponse) });

export type SitemapEntryResponse = __TypedOpenapi.Schemas.SitemapEntryResponse;
export const SitemapEntryResponse = z.object({ id: z.number().int(), updatedAt: z.iso.datetime({ offset: true }) });

export type SitemapResponse = __TypedOpenapi.Schemas.SitemapResponse;
export const SitemapResponse = z.object({ categories: z.array(SitemapEntryResponse), brands: z.array(SitemapEntryResponse), curations: z.array(SitemapEntryResponse), ingredients: z.array(SitemapEntryResponse) });

export type RankingChangeItem = __TypedOpenapi.Schemas.RankingChangeItem;
export const RankingChangeItem = z.object({ movement: z.string(), steps: z.number().int() });

export type RankingItem = __TypedOpenapi.Schemas.RankingItem;
export const RankingItem = z.object({ rank: z.number().int(), keyword: z.string(), change: RankingChangeItem });

export type RankingsResponse = __TypedOpenapi.Schemas.RankingsResponse;
export const RankingsResponse = z.object({ items: z.array(RankingItem) });

export type ProductSort = __TypedOpenapi.Schemas.ProductSort;
export const ProductSort = z.enum(["DEFAULT", "CREATED_ASC", "PRICE_DESC", "PRICE_ASC", "UNIT_PRICE_DESC", "UNIT_PRICE_ASC"]).default("DEFAULT");

export type CategoryChildResponse = __TypedOpenapi.Schemas.CategoryChildResponse;
export const CategoryChildResponse = z.object({ id: z.number().int(), name: z.string(), productCount: z.number().int() });

export type CategoryResponse = __TypedOpenapi.Schemas.CategoryResponse;
export const CategoryResponse = z.object({ id: z.number().int(), name: z.string(), children: z.array(CategoryChildResponse), productCount: z.number().int() });

export type ProductAttributeValueOptionResponse = __TypedOpenapi.Schemas.ProductAttributeValueOptionResponse;
export const ProductAttributeValueOptionResponse = z.object({ valueCode: z.string(), name: z.string(), productCount: z.number().int().min(0) });

export type ProductAttributeOptionResponse = __TypedOpenapi.Schemas.ProductAttributeOptionResponse;
export const ProductAttributeOptionResponse = z.object({ attributeCode: z.string(), name: z.string(), values: z.array(ProductAttributeValueOptionResponse) });

export type ProductFilterOptionsResponse = __TypedOpenapi.Schemas.ProductFilterOptionsResponse;
export const ProductFilterOptionsResponse = z.object({ brands: z.array(BrandResponse), categories: z.array(CategoryResponse), skinTypes: z.array(SkinTypeResponse), sensitiveSkin: z.boolean(), attributes: z.array(ProductAttributeOptionResponse) });

export type ProductPageResponse = __TypedOpenapi.Schemas.ProductPageResponse;
export const ProductPageResponse = z.object({ items: z.array(ProductResponse), pagination: PaginationResponse, brands: z.array(BrandResponse), categories: z.array(CategoryResponse), skinTypes: z.array(SkinTypeResponse), filterOptions: ProductFilterOptionsResponse.optional() });

export type CategorySummaryResponse = __TypedOpenapi.Schemas.CategorySummaryResponse;
export const CategorySummaryResponse = z.object({ id: z.number().int(), name: z.string() });

export type CategoryPathResponse = __TypedOpenapi.Schemas.CategoryPathResponse;
export const CategoryPathResponse = z.object({ id: z.number().int(), name: z.string(), child: CategorySummaryResponse });

export type ExcludeGroupResponse = __TypedOpenapi.Schemas.ExcludeGroupResponse;
export const ExcludeGroupResponse = z.object({ code: z.string(), name: z.string(), contains: z.boolean() });

export type IngredientCautionResponse = __TypedOpenapi.Schemas.IngredientCautionResponse;
export const IngredientCautionResponse = z.object({ code: z.string(), label: z.string() });

export type IngredientGroupSummaryResponse = __TypedOpenapi.Schemas.IngredientGroupSummaryResponse;
export const IngredientGroupSummaryResponse = z.object({ code: z.string(), name: z.string() });

export type ProductVariantResponse = __TypedOpenapi.Schemas.ProductVariantResponse;
export const ProductVariantResponse = z.object({ id: z.number().int(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), status: z.string() });

export type ProductPartSummaryResponse = __TypedOpenapi.Schemas.ProductPartSummaryResponse;
export const ProductPartSummaryResponse = z.object({ id: z.number().int(), name: z.string().nullable(), cautionCount: z.number().int() });

export type ProductIngredientResponse = __TypedOpenapi.Schemas.ProductIngredientResponse;
export const ProductIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), cautions: z.array(IngredientCautionResponse) });

export type SkinEffectIngredientResponse = __TypedOpenapi.Schemas.SkinEffectIngredientResponse;
export const SkinEffectIngredientResponse = z.object({ id: z.number().int(), koreanName: z.string() });

export type SkinEffectItemResponse = __TypedOpenapi.Schemas.SkinEffectItemResponse;
export const SkinEffectItemResponse = z.object({ ingredientGroup: IngredientGroupSummaryResponse.nullable(), ingredients: z.array(SkinEffectIngredientResponse) });

export type SkinEffectGroupResponse = __TypedOpenapi.Schemas.SkinEffectGroupResponse;
export const SkinEffectGroupResponse = z.object({ id: z.string(), code: z.string(), name: z.string(), ingredientIds: z.array(z.number().int()), items: z.array(SkinEffectItemResponse) });

export type ProductPartResponse = __TypedOpenapi.Schemas.ProductPartResponse;
export const ProductPartResponse = z.object({ id: z.number().int(), name: z.string().nullable(), ingredients: z.array(ProductIngredientResponse), skinEffectGroups: z.array(SkinEffectGroupResponse), excludeGroups: z.array(ExcludeGroupResponse) });

export type ProductDetailResponse = __TypedOpenapi.Schemas.ProductDetailResponse;
export const ProductDetailResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, categories: z.array(CategoryPathResponse), marks: z.array(MarkResponse), imageUrl: z.string(), variants: z.array(ProductVariantResponse), moistureLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), oilLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), sensitiveSkin: z.boolean(), productParts: z.array(ProductPartSummaryResponse), selectedPart: ProductPartResponse.nullable(), updatedAt: z.iso.datetime({ offset: true }) });

export type SimilarProductResponse = __TypedOpenapi.Schemas.SimilarProductResponse;
export const SimilarProductResponse = z.object({ id: z.number().int(), name: z.string(), brand: BrandResponse, marks: z.array(MarkResponse), imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), priceDifference: z.number().int(), moistureLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), oilLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), partId: z.number().int(), containsExcludedIngredient: z.boolean() });

export type ProductSimilarityResponse = __TypedOpenapi.Schemas.ProductSimilarityResponse;
export const ProductSimilarityResponse = z.object({ partId: z.number().int().nullable(), calculated: z.boolean(), items: z.array(SimilarProductResponse) });

export type ShareMatchStatus = __TypedOpenapi.Schemas.ShareMatchStatus;
export const ShareMatchStatus = z.enum(["MATCHED", "NOT_FOUND"]);

export type ShareMatchResponse = __TypedOpenapi.Schemas.ShareMatchResponse;
export const ShareMatchResponse = z.object({ status: ShareMatchStatus, productId: z.number().int().nullable().optional(), keyword: z.string().nullable().optional() });

export type RelatedKeywordMatchResponse = __TypedOpenapi.Schemas.RelatedKeywordMatchResponse;
export const RelatedKeywordMatchResponse = z.object({ startIndex: z.number().int().min(0), endIndexExclusive: z.number().int().min(1) });

export type RelatedKeywordResponse = __TypedOpenapi.Schemas.RelatedKeywordResponse;
export const RelatedKeywordResponse = z.object({ keyword: z.string(), matches: z.array(RelatedKeywordMatchResponse).min(1) });

export type RelatedKeywordsResponse = __TypedOpenapi.Schemas.RelatedKeywordsResponse;
export const RelatedKeywordsResponse = z.object({ items: z.array(RelatedKeywordResponse) });

export type ProductRankingProductResponse = __TypedOpenapi.Schemas.ProductRankingProductResponse;
export const ProductRankingProductResponse = z.object({ id: z.number().int(), name: z.string(), brandName: z.string(), marks: z.array(MarkResponse), imageUrl: z.string(), price: z.number().int(), moistureLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), oilLevel: z.number().min(0).max(3).multipleOf(0.5).nullable() });

export type ProductRankingItemResponse = __TypedOpenapi.Schemas.ProductRankingItemResponse;
export const ProductRankingItemResponse = z.object({ product: ProductRankingProductResponse });

export type ProductRankingResponse = __TypedOpenapi.Schemas.ProductRankingResponse;
export const ProductRankingResponse = z.object({ items: z.array(ProductRankingItemResponse) });

export type ProductCountResponse = __TypedOpenapi.Schemas.ProductCountResponse;
export const ProductCountResponse = z.object({ count: z.number().int() });

export type NoticePageResponse = __TypedOpenapi.Schemas.NoticePageResponse;
export const NoticePageResponse = z.object({ items: z.array(NoticeResponse), pagination: PaginationResponse });

export type NoticeBannerResponse = __TypedOpenapi.Schemas.NoticeBannerResponse;
export const NoticeBannerResponse = z.object({ id: z.uuid(), text: z.string() });

export type NoticeBannersResponse = __TypedOpenapi.Schemas.NoticeBannersResponse;
export const NoticeBannersResponse = z.object({ items: z.array(NoticeBannerResponse) });

export type IngredientResponse = __TypedOpenapi.Schemas.IngredientResponse;
export const IngredientResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), skinEffects: z.array(SkinEffectResponse) });

export type IngredientPageResponse = __TypedOpenapi.Schemas.IngredientPageResponse;
export const IngredientPageResponse = z.object({ items: z.array(IngredientResponse), pagination: PaginationResponse });

export type IngredientDetailResponse = __TypedOpenapi.Schemas.IngredientDetailResponse;
export const IngredientDetailResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), description: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), groupCodes: z.array(z.string()), productCount: z.number().int(), infoSources: z.array(z.string()), effectSources: z.array(z.string()), updatedAt: z.iso.datetime({ offset: true }) });

export type ExcludeGroupSummaryResponse = __TypedOpenapi.Schemas.ExcludeGroupSummaryResponse;
export const ExcludeGroupSummaryResponse = z.object({ code: z.string(), name: z.string() });

export type IngredientGroupSuggestionResponse = __TypedOpenapi.Schemas.IngredientGroupSuggestionResponse;
export const IngredientGroupSuggestionResponse = z.object({ code: z.string(), name: z.string(), ingredientIds: z.array(z.number().int()) });

export type IngredientMatchField = __TypedOpenapi.Schemas.IngredientMatchField;
export const IngredientMatchField = z.enum(["KOREAN_NAME", "ENGLISH_NAME", "ALIAS"]);

export type IngredientSuggestionMatchResponse = __TypedOpenapi.Schemas.IngredientSuggestionMatchResponse;
export const IngredientSuggestionMatchResponse = z.object({ field: IngredientMatchField, text: z.string(), startIndex: z.number().int().min(0), endIndexExclusive: z.number().int().min(1) });

export type IngredientSuggestionResponse = __TypedOpenapi.Schemas.IngredientSuggestionResponse;
export const IngredientSuggestionResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string(), formulationRoles: z.array(FormulationRoleResponse), skinEffects: z.array(SkinEffectResponse), excludeGroups: z.array(ExcludeGroupSummaryResponse), match: IngredientSuggestionMatchResponse });

export type IngredientListResponse = __TypedOpenapi.Schemas.IngredientListResponse;
export const IngredientListResponse = z.object({ items: z.array(IngredientSuggestionResponse), groups: z.array(IngredientGroupSuggestionResponse) });

export type IngredientGroupType = __TypedOpenapi.Schemas.IngredientGroupType;
export const IngredientGroupType = z.literal("QUICK_EXCLUDE");

export type IngredientGroupMemberResponse = __TypedOpenapi.Schemas.IngredientGroupMemberResponse;
export const IngredientGroupMemberResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string().nullable() });

export type IngredientGroupResponse = __TypedOpenapi.Schemas.IngredientGroupResponse;
export const IngredientGroupResponse = z.object({ code: z.string(), name: z.string(), englishName: z.string().nullable(), description: z.string(), ingredients: z.array(IngredientGroupMemberResponse) });

export type IngredientGroupListResponse = __TypedOpenapi.Schemas.IngredientGroupListResponse;
export const IngredientGroupListResponse = z.object({ items: z.array(IngredientGroupResponse) });

export type IngredientSummaryResponse = __TypedOpenapi.Schemas.IngredientSummaryResponse;
export const IngredientSummaryResponse = z.object({ id: z.number().int(), koreanName: z.string(), englishName: z.string() });

export type ExcludeCodeResponse = __TypedOpenapi.Schemas.ExcludeCodeResponse;
export const ExcludeCodeResponse = z.object({ code: z.string(), name: z.string(), description: z.string(), ingredients: z.array(IngredientSummaryResponse) });

export type ExcludeCodeListResponse = __TypedOpenapi.Schemas.ExcludeCodeListResponse;
export const ExcludeCodeListResponse = z.object({ items: z.array(ExcludeCodeResponse) });

export type CurationImageBlockResponse = __TypedOpenapi.Schemas.CurationImageBlockResponse;
export const CurationImageBlockResponse = z.object({ id: z.uuid(), type: z.literal("IMAGE"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), imageUrl: z.string(), altText: z.string().nullable(), bodyText: z.string().nullable() });

export type CurationProductResponse = __TypedOpenapi.Schemas.CurationProductResponse;
export const CurationProductResponse = z.object({ id: z.number().int(), name: z.string(), brandName: z.string(), imageUrl: z.string(), price: z.number().int(), volumeValue: z.number(), volumeUnit: z.string(), moistureLevel: z.number().min(0).max(3).multipleOf(0.5).nullable(), oilLevel: z.number().min(0).max(3).multipleOf(0.5).nullable() });

export type CurationProductsBlockResponse = __TypedOpenapi.Schemas.CurationProductsBlockResponse;
export const CurationProductsBlockResponse = z.object({ id: z.uuid(), type: z.literal("PRODUCTS"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), products: z.array(CurationProductResponse).min(1).max(2147483647) });

export type CurationFilterResponse = __TypedOpenapi.Schemas.CurationFilterResponse;
export const CurationFilterResponse = z.object({ id: z.uuid(), label: z.string() });

export type CurationProductItemResponse = __TypedOpenapi.Schemas.CurationProductItemResponse;
export const CurationProductItemResponse = z.object({ product: CurationProductResponse, filterIds: z.array(z.uuid()).min(1).max(2147483647) });

export type CurationProductsByFilterBlockResponse = __TypedOpenapi.Schemas.CurationProductsByFilterBlockResponse;
export const CurationProductsByFilterBlockResponse = z.object({ id: z.uuid(), type: z.literal("PRODUCTS_BY_FILTER"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), filters: z.array(CurationFilterResponse).min(1).max(2147483647), products: z.array(CurationProductItemResponse).min(1).max(2147483647) });

export type CurationProductLinkQueryResponse = __TypedOpenapi.Schemas.CurationProductLinkQueryResponse;
export const CurationProductLinkQueryResponse = z.object({ keyword: z.string().max(100).nullable(), brandIds: z.array(z.number().int().min(1)).min(0).max(100).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), categoryIds: z.array(z.number().int().min(1)).min(0).max(100).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeIngredientIds: z.array(z.number().int().min(1)).min(0).max(100).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeGroupCodes: z.array(z.string().min(1)).min(0).max(100).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }) });

export type CurationProductLinkBlockResponse = __TypedOpenapi.Schemas.CurationProductLinkBlockResponse;
export const CurationProductLinkBlockResponse = z.object({ id: z.uuid(), type: z.literal("PRODUCT_LINK"), spacingTop: z.number().int().min(0), spacingBottom: z.number().int().min(0), label: z.string().min(1), query: CurationProductLinkQueryResponse });

export type CurationBlockResponse = __TypedOpenapi.Schemas.CurationBlockResponse;
export const CurationBlockResponse = z.discriminatedUnion("type", [CurationImageBlockResponse.extend({ type: z.literal("IMAGE") }), CurationProductsBlockResponse.extend({ type: z.literal("PRODUCTS") }), CurationProductsByFilterBlockResponse.extend({ type: z.literal("PRODUCTS_BY_FILTER") }), CurationProductLinkBlockResponse.extend({ type: z.literal("PRODUCT_LINK") })]);

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

export type BannerSlot = __TypedOpenapi.Schemas.BannerSlot;
export const BannerSlot = z.enum(["MAIN", "STRIP"]);

export type CurationBannerTargetResponse = __TypedOpenapi.Schemas.CurationBannerTargetResponse;
export const CurationBannerTargetResponse = z.object({ type: z.literal("CURATION"), curationId: z.number().int().min(1) });

export type ProductListBannerTargetResponse = __TypedOpenapi.Schemas.ProductListBannerTargetResponse;
export const ProductListBannerTargetResponse = z.object({ type: z.literal("PRODUCT_LIST"), query: CurationProductLinkQueryResponse });

export type ExternalBannerTargetResponse = __TypedOpenapi.Schemas.ExternalBannerTargetResponse;
export const ExternalBannerTargetResponse = z.object({ type: z.literal("EXTERNAL"), url: z.string() });

export type BannerTargetResponse = __TypedOpenapi.Schemas.BannerTargetResponse;
export const BannerTargetResponse = z.discriminatedUnion("type", [CurationBannerTargetResponse.extend({ type: z.literal("CURATION") }), ProductListBannerTargetResponse.extend({ type: z.literal("PRODUCT_LIST") }), ExternalBannerTargetResponse.extend({ type: z.literal("EXTERNAL") })]);

export type BannerResponse = __TypedOpenapi.Schemas.BannerResponse;
export const BannerResponse = z.object({ id: z.number().int(), title: z.string(), description: z.string(), imageUrl: z.string(), target: BannerTargetResponse });

export type BannerListResponse = __TypedOpenapi.Schemas.BannerListResponse;
export const BannerListResponse = z.object({ items: z.array(BannerResponse) });

export type WithdrawnAccountResponse = __TypedOpenapi.Schemas.WithdrawnAccountResponse;
export const WithdrawnAccountResponse = z.object({ provider: OAuthProvider, email: z.string(), withdrawnAt: z.iso.datetime({ offset: true }), restorableUntil: z.iso.datetime({ offset: true }) });

export type RegisteredAccountResponse = __TypedOpenapi.Schemas.RegisteredAccountResponse;
export const RegisteredAccountResponse = z.object({ provider: OAuthProvider, email: z.string() });

export type AdminRecoveryAccount = __TypedOpenapi.Schemas.AdminRecoveryAccount;
export const AdminRecoveryAccount = z.object({ userId: z.number().int(), provider: OAuthProvider, maskedEmail: z.string(), withdrawnAt: z.iso.datetime({ offset: true }), requestedAt: z.iso.datetime({ offset: true }).nullable(), purgeEligibleAt: z.iso.datetime({ offset: true }), restoredAt: z.iso.datetime({ offset: true }).nullable(), canRestore: z.boolean(), status: z.string() });

export type AdminRecoveryPreviewResponse = __TypedOpenapi.Schemas.AdminRecoveryPreviewResponse;
export const AdminRecoveryPreviewResponse = z.object({ account: AdminRecoveryAccount, shelf: z.number().int(), ratings: z.number().int(), wishlist: z.number().int(), filters: z.number().int(), profileStored: z.boolean() });

export type RecoveryStatus = __TypedOpenapi.Schemas.RecoveryStatus;
export const RecoveryStatus = z.enum(["AVAILABLE", "EXPIRING", "EXPIRED", "RESTORED"]);

export type AdminRecoveryPageResponse = __TypedOpenapi.Schemas.AdminRecoveryPageResponse;
export const AdminRecoveryPageResponse = z.object({ items: z.array(AdminRecoveryAccount), pagination: PaginationResponse });

export type AdminRecoverySummaryResponse = __TypedOpenapi.Schemas.AdminRecoverySummaryResponse;
export const AdminRecoverySummaryResponse = z.object({ available: z.number().int(), expiring: z.number().int(), restored: z.number().int(), purged: z.number().int(), trackingStartedAt: z.iso.datetime({ offset: true }) });

export type AdminRestoreRequestResponse = __TypedOpenapi.Schemas.AdminRestoreRequestResponse;
export const AdminRestoreRequestResponse = z.object({ userId: z.number().int(), provider: OAuthProvider, email: z.string(), withdrawnAt: z.iso.datetime({ offset: true }), requestedAt: z.iso.datetime({ offset: true }) });

export type AdminRestoreRequestPageResponse = __TypedOpenapi.Schemas.AdminRestoreRequestPageResponse;
export const AdminRestoreRequestPageResponse = z.object({ items: z.array(AdminRestoreRequestResponse), pagination: PaginationResponse });

export type AdminProductRequestPageResponse = __TypedOpenapi.Schemas.AdminProductRequestPageResponse;
export const AdminProductRequestPageResponse = z.object({ items: z.array(AdminProductRequestResponse), pagination: PaginationResponse });

export type AdminNoticeSummaryResponse = __TypedOpenapi.Schemas.AdminNoticeSummaryResponse;
export const AdminNoticeSummaryResponse = z.object({ published: z.number().int(), privateCount: z.number().int(), bannerEnabledCount: z.number().int(), bannerVisibleCount: z.number().int() });

export type AdminSessionResponse = __TypedOpenapi.Schemas.AdminSessionResponse;
export const AdminSessionResponse = z.object({ username: z.string() });

export type AdminInquiryResponse = __TypedOpenapi.Schemas.AdminInquiryResponse;
export const AdminInquiryResponse = z.object({ kind: InquiryKind, id: z.uuid(), type: z.string(), content: z.string(), productName: z.string().nullable(), brandName: z.string().nullable(), path: z.string().nullable(), status: FeedbackStatus, assigned: z.boolean(), receivedAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }) });

export type AdminInquiryPageResponse = __TypedOpenapi.Schemas.AdminInquiryPageResponse;
export const AdminInquiryPageResponse = z.object({ items: z.array(AdminInquiryResponse), pagination: PaginationResponse });

export type AdminInquiryMemoResponse = __TypedOpenapi.Schemas.AdminInquiryMemoResponse;
export const AdminInquiryMemoResponse = z.object({ id: z.uuid(), content: z.string(), authorName: z.string(), createdAt: z.iso.datetime({ offset: true }) });

export type AdminInquiryEventResponse = __TypedOpenapi.Schemas.AdminInquiryEventResponse;
export const AdminInquiryEventResponse = z.object({ id: z.uuid(), type: z.string(), previousValue: z.string().nullable(), currentValue: z.string().nullable(), memo: z.string().nullable(), actor: z.string(), occurredAt: z.iso.datetime({ offset: true }) });

export type AdminInquiryDetailResponse = __TypedOpenapi.Schemas.AdminInquiryDetailResponse;
export const AdminInquiryDetailResponse = z.object({ inquiry: AdminInquiryResponse, memos: z.array(AdminInquiryMemoResponse), events: z.array(AdminInquiryEventResponse), images: z.array(AdminFeedbackImageResponse) });

export type AdminInquiryNeighborsResponse = __TypedOpenapi.Schemas.AdminInquiryNeighborsResponse;
export const AdminInquiryNeighborsResponse = z.object({ previous: AdminInquiryTarget.nullable(), next: AdminInquiryTarget.nullable(), position: z.number().int(), total: z.number().int() });

export type AdminInquirySummaryResponse = __TypedOpenapi.Schemas.AdminInquirySummaryResponse;
export const AdminInquirySummaryResponse = z.object({ received: z.number().int(), inProgress: z.number().int(), reviewPlanned: z.number().int(), completed: z.number().int(), rejected: z.number().int(), today: z.number().int() });

export type AdminFeedbackPageResponse = __TypedOpenapi.Schemas.AdminFeedbackPageResponse;
export const AdminFeedbackPageResponse = z.object({ items: z.array(AdminFeedbackResponse), pagination: PaginationResponse });

export type ErrorCode = __TypedOpenapi.Schemas.ErrorCode;
export const ErrorCode = z.enum(["INVALID_QUERY_PARAMETER", "INVALID_REQUEST_BODY", "INVALID_FEEDBACK_IMAGE", "INVALID_FEEDBACK_IMAGE_ID", "CONFLICTING_INGREDIENT_FILTER", "SHELF_PRODUCT_ALREADY_EXISTS", "PAYLOAD_TOO_LARGE", "TOO_MANY_REQUESTS", "UNSUPPORTED_REQUEST", "UNAUTHORIZED", "FORBIDDEN_ORIGIN", "FORBIDDEN", "OAUTH_LOGIN_FAILED", "OAUTH_EMAIL_NOT_VERIFIED", "MEMBER_EMAIL_ALREADY_REGISTERED", "NOTICE_NOT_FOUND", "NOTICE_NOT_PRIVATE", "FEEDBACK_NOT_FOUND", "MEMBER_NOT_FOUND", "SIGNUP_ACCOUNT_NOT_FOUND", "WITHDRAWN_MEMBER_NOT_FOUND", "REGISTERED_ACCOUNT_NOT_FOUND", "RESTORE_REQUEST_NOT_FOUND", "PRODUCT_REQUEST_NOT_FOUND", "CURATION_NOT_FOUND", "PRODUCT_NOT_FOUND", "PRODUCT_PART_NOT_FOUND", "SHELF_PRODUCT_NOT_FOUND", "WISHLIST_PRODUCT_NOT_FOUND", "BRAND_NOT_FOUND", "INGREDIENT_NOT_FOUND", "INGREDIENT_GROUP_NOT_FOUND", "ENDPOINT_NOT_FOUND", "INTERNAL_SERVER_ERROR"]);

export type ProblemDetail = __TypedOpenapi.Schemas.ProblemDetail;
export const ProblemDetail = z.object({ type: z.url().optional(), title: z.string(), status: z.number().int(), detail: z.string(), instance: z.string().optional(), code: ErrorCode });

// </Schemas>

// <Endpoints>
export type put_AddToWishlist = __TypedOpenapi.Endpoints.put_AddToWishlist;
export const put_AddToWishlist = {
  method: z.literal("PUT"),
  path: z.literal("/api/users/me/wishlist/products/{productId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type delete_RemoveFromWishlist = __TypedOpenapi.Endpoints.delete_RemoveFromWishlist;
export const delete_RemoveFromWishlist = {
  method: z.literal("DELETE"),
  path: z.literal("/api/users/me/wishlist/products/{productId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type put_Update = __TypedOpenapi.Endpoints.put_Update;
export const put_Update = {
  method: z.literal("PUT"),
  path: z.literal("/api/users/me/shelf/products/{productId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }), body: ShelfProductUpdateRequest },
  responses: { 200: ShelfProductResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type delete_Remove = __TypedOpenapi.Endpoints.delete_Remove;
export const delete_Remove = {
  method: z.literal("DELETE"),
  path: z.literal("/api/users/me/shelf/products/{productId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type put_ChangePushTokenEnabled = __TypedOpenapi.Endpoints.put_ChangePushTokenEnabled;
export const put_ChangePushTokenEnabled = {
  method: z.literal("PUT"),
  path: z.literal("/api/push-tokens/enabled"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: PushTokenEnabledRequest },
  responses: { 204: z.unknown(), 400: ProblemDetail, 500: ProblemDetail },
};

export type get_Detail = __TypedOpenapi.Endpoints.get_Detail;
export const get_Detail = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/notices/{id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.uuid() }) },
  responses: { 200: NoticeResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type put_Update_1 = __TypedOpenapi.Endpoints.put_Update_1;
export const put_Update_1 = {
  method: z.literal("PUT"),
  path: z.literal("/api/admin/notices/{id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.uuid() }), body: AdminNoticeEditRequest },
  responses: { 200: NoticeResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type delete_Delete = __TypedOpenapi.Endpoints.delete_Delete;
export const delete_Delete = {
  method: z.literal("DELETE"),
  path: z.literal("/api/admin/notices/{id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.uuid() }) },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 409: ProblemDetail, 500: ProblemDetail },
};

export type post_RestoreToWishlist = __TypedOpenapi.Endpoints.post_RestoreToWishlist;
export const post_RestoreToWishlist = {
  method: z.literal("POST"),
  path: z.literal("/api/users/me/wishlist/products/{productId}/restore"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type post_AddIngredients = __TypedOpenapi.Endpoints.post_AddIngredients;
export const post_AddIngredients = {
  method: z.literal("POST"),
  path: z.literal("/api/users/me/skin-filter/ingredients"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: SkinFilterIngredientsRequest },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type delete_RemoveIngredients = __TypedOpenapi.Endpoints.delete_RemoveIngredients;
export const delete_RemoveIngredients = {
  method: z.literal("DELETE"),
  path: z.literal("/api/users/me/skin-filter/ingredients"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ ingredientIds: z.array(z.coerce.number().int()).min(1).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }) }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindShelfProducts = __TypedOpenapi.Endpoints.get_FindShelfProducts;
export const get_FindShelfProducts = {
  method: z.literal("GET"),
  path: z.literal("/api/users/me/shelf/products"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: ShelfResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type post_Add = __TypedOpenapi.Endpoints.post_Add;
export const post_Add = {
  method: z.literal("POST"),
  path: z.literal("/api/users/me/shelf/products"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: ShelfProductAddRequest },
  responses: { 201: ShelfProductResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type post_RestoreToShelf = __TypedOpenapi.Endpoints.post_RestoreToShelf;
export const post_RestoreToShelf = {
  method: z.literal("POST"),
  path: z.literal("/api/users/me/shelf/products/{productId}/restore"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type post_Record = __TypedOpenapi.Endpoints.post_Record;
export const post_Record = {
  method: z.literal("POST"),
  path: z.literal("/api/search-keywords"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: SearchKeywordRequest },
  responses: { 204: z.unknown(), 400: ProblemDetail, 500: ProblemDetail },
};

export type post_RegisterPushToken = __TypedOpenapi.Endpoints.post_RegisterPushToken;
export const post_RegisterPushToken = {
  method: z.literal("POST"),
  path: z.literal("/api/push-tokens"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: PushTokenRequest },
  responses: { 200: PushTokenResponse, 400: ProblemDetail, 500: ProblemDetail },
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

export type post_View = __TypedOpenapi.Endpoints.post_View;
export const post_View = {
  method: z.literal("POST"),
  path: z.literal("/api/notices/{id}/views"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.uuid() }) },
  responses: { 200: z.unknown(), 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
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
  path: z.literal("/api/auth/{provider}/app-login"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ provider: z.enum(["kakao", "google"]) }), body: AppLoginRequest },
  responses: { 200: AppLoginResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type post_RequestRestore = __TypedOpenapi.Endpoints.post_RequestRestore;
export const post_RequestRestore = {
  method: z.literal("POST"),
  path: z.literal("/api/auth/withdrawn/restore"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 204: z.unknown(), 404: ProblemDetail, 500: ProblemDetail },
};

export type post_SignUp = __TypedOpenapi.Endpoints.post_SignUp;
export const post_SignUp = {
  method: z.literal("POST"),
  path: z.literal("/api/auth/signup"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 204: z.unknown(), 404: ProblemDetail, 500: ProblemDetail },
};

export type post_Restore = __TypedOpenapi.Endpoints.post_Restore;
export const post_Restore = {
  method: z.literal("POST"),
  path: z.literal("/api/admin/users/{userId}/restore"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ userId: z.coerce.number().int() }) },
  responses: { 204: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_List = __TypedOpenapi.Endpoints.get_List;
export const get_List = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/notices"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ q: z.string().min(0).max(40), status: NoticeStatus, oldest: z.coerce.boolean().default(false), page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: NoticePageResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type post_Create = __TypedOpenapi.Endpoints.post_Create;
export const post_Create = {
  method: z.literal("POST"),
  path: z.literal("/api/admin/notices"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: AdminNoticeEditRequest },
  responses: { 200: NoticeResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type post_Upload = __TypedOpenapi.Endpoints.post_Upload;
export const post_Upload = {
  method: z.literal("POST"),
  path: z.literal("/api/admin/notices/images"),
  requestFormat: z.literal("form-data"),
  responseFormat: z.literal("json"),
  parameters: { body: z.object({ images: z.array(z.custom<Blob>((v) => typeof Blob !== "undefined" && v instanceof Blob)) }) },
  responses: { 200: NoticeImageUploadResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 413: ProblemDetail, 429: ProblemDetail, 500: ProblemDetail },
};

export type post_Login_1 = __TypedOpenapi.Endpoints.post_Login_1;
export const post_Login_1 = {
  method: z.literal("POST"),
  path: z.literal("/api/admin/login"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: AdminLoginRequest },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: z.unknown(), 429: ProblemDetail, 500: ProblemDetail },
};

export type post_Memo = __TypedOpenapi.Endpoints.post_Memo;
export const post_Memo = {
  method: z.literal("POST"),
  path: z.literal("/api/admin/inquiries/{kind}/{id}/memos"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ kind: InquiryKind, id: z.uuid() }), body: MemoRequest },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type patch_UpdateMyProfile = __TypedOpenapi.Endpoints.patch_UpdateMyProfile;
export const patch_UpdateMyProfile = {
  method: z.literal("PATCH"),
  path: z.literal("/api/users/me/profile"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: UserProfileRequest },
  responses: { 200: UserResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 429: ProblemDetail, 500: ProblemDetail },
};

export type patch_ChangeStatus = __TypedOpenapi.Endpoints.patch_ChangeStatus;
export const patch_ChangeStatus = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/product-requests/{requestId}/status"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ requestId: z.uuid() }), body: AdminProductRequestStatusUpdateRequest },
  responses: { 200: AdminProductRequestResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type patch_Status = __TypedOpenapi.Endpoints.patch_Status;
export const patch_Status = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/inquiries/{kind}/{id}/status"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ kind: InquiryKind, id: z.uuid() }), body: Status },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type patch_Assign = __TypedOpenapi.Endpoints.patch_Assign;
export const patch_Assign = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/inquiries/{kind}/{id}/assignee"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ kind: InquiryKind, id: z.uuid() }), body: Assignee },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type patch_BulkStatus = __TypedOpenapi.Endpoints.patch_BulkStatus;
export const patch_BulkStatus = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/inquiries/status"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: BulkStatus },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type patch_BulkAssign = __TypedOpenapi.Endpoints.patch_BulkAssign;
export const patch_BulkAssign = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/inquiries/assignee"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: BulkAssignee },
  responses: { 200: z.unknown(), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type patch_ChangeStatus_1 = __TypedOpenapi.Endpoints.patch_ChangeStatus_1;
export const patch_ChangeStatus_1 = {
  method: z.literal("PATCH"),
  path: z.literal("/api/admin/feedbacks/{feedbackId}/status"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ feedbackId: z.uuid() }), body: AdminFeedbackStatusUpdateRequest },
  responses: { 200: AdminFeedbackResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindMe = __TypedOpenapi.Endpoints.get_FindMe;
export const get_FindMe = {
  method: z.literal("GET"),
  path: z.literal("/api/users/me"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: UserResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type delete_Withdraw = __TypedOpenapi.Endpoints.delete_Withdraw;
export const delete_Withdraw = {
  method: z.literal("DELETE"),
  path: z.literal("/api/users/me"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 204: z.unknown(), 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindWishlistProducts = __TypedOpenapi.Endpoints.get_FindWishlistProducts;
export const get_FindWishlistProducts = {
  method: z.literal("GET"),
  path: z.literal("/api/users/me/wishlist/products"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: WishlistResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindSkinFilter = __TypedOpenapi.Endpoints.get_FindSkinFilter;
export const get_FindSkinFilter = {
  method: z.literal("GET"),
  path: z.literal("/api/users/me/skin-filter"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: SkinFilterResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_SuggestShelfProducts = __TypedOpenapi.Endpoints.get_SuggestShelfProducts;
export const get_SuggestShelfProducts = {
  method: z.literal("GET"),
  path: z.literal("/api/users/me/shelf/product-suggestions"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ keyword: z.string().min(1).max(100), page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }) },
  responses: { 200: ProductSuggestionPageResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_AnalyzeIngredients = __TypedOpenapi.Endpoints.get_AnalyzeIngredients;
export const get_AnalyzeIngredients = {
  method: z.literal("GET"),
  path: z.literal("/api/users/me/shelf/ingredient-analysis"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: IngredientAnalysisResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindUserProduct = __TypedOpenapi.Endpoints.get_FindUserProduct;
export const get_FindUserProduct = {
  method: z.literal("GET"),
  path: z.literal("/api/users/me/products/{productId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ partId: z.coerce.number().int() }).partial().optional(), path: z.object({ productId: z.coerce.number().int() }) },
  responses: { 200: UserProductResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
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

export type get_FindContentUpdates = __TypedOpenapi.Endpoints.get_FindContentUpdates;
export const get_FindContentUpdates = {
  method: z.literal("GET"),
  path: z.literal("/api/sitemap"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: SitemapResponse, 500: ProblemDetail },
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
  parameters: { query: z.object({ keyword: z.string().max(100).regex(new RegExp(".*\\S.*")), categoryIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), brandIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), moistureLevel: z.array(z.coerce.number().min(0).max(3).multipleOf(0.5)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), oilLevel: z.array(z.coerce.number().min(0).max(3).multipleOf(0.5)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeCodes: z.array(ExcludeCode).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), skinType: z.array(SkinType).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), sensitiveSkin: z.coerce.boolean(), attributes: z.array(z.string()).min(1).max(2147483647).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), sort: ProductSort, page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
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

export type get_RelatedKeywords = __TypedOpenapi.Endpoints.get_RelatedKeywords;
export const get_RelatedKeywords = {
  method: z.literal("GET"),
  path: z.literal("/api/products/related-keywords"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ keyword: z.string().min(1).max(100) }) },
  responses: { 200: RelatedKeywordsResponse, 400: ProblemDetail, 500: ProblemDetail },
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
  parameters: { query: z.object({ keyword: z.string().max(100).regex(new RegExp(".*\\S.*")), categoryIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), brandIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), moistureLevel: z.array(z.coerce.number().min(0).max(3).multipleOf(0.5)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), oilLevel: z.array(z.coerce.number().min(0).max(3).multipleOf(0.5)).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeIngredientIds: z.array(z.coerce.number().int()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeCodes: z.array(ExcludeCode).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), includeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), excludeGroupCodes: z.array(z.string()).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), skinType: z.array(SkinType).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }), sensitiveSkin: z.coerce.boolean(), attributes: z.array(z.string()).min(1).max(2147483647).refine((arr) => new Set(arr).size === arr.length, { message: "uniqueItems" }) }).partial().optional() },
  responses: { 200: ProductCountResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_List_1 = __TypedOpenapi.Endpoints.get_List_1;
export const get_List_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/notices"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: NoticePageResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_Detail_1 = __TypedOpenapi.Endpoints.get_Detail_1;
export const get_Detail_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/notices/{id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.uuid() }) },
  responses: { 200: NoticeResponse, 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Image = __TypedOpenapi.Endpoints.get_Image;
export const get_Image = {
  method: z.literal("GET"),
  path: z.literal("/api/notices/{id}/images/{imageId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.uuid(), imageId: z.uuid() }) },
  responses: { 200: z.custom<Blob>((v) => typeof Blob !== "undefined" && v instanceof Blob), 400: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Banners = __TypedOpenapi.Endpoints.get_Banners;
export const get_Banners = {
  method: z.literal("GET"),
  path: z.literal("/api/notices/banners"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: NoticeBannersResponse, 500: ProblemDetail },
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

export type get_FindIngredientGroups = __TypedOpenapi.Endpoints.get_FindIngredientGroups;
export const get_FindIngredientGroups = {
  method: z.literal("GET"),
  path: z.literal("/api/ingredient-groups"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ type: IngredientGroupType }).partial().optional() },
  responses: { 200: IngredientGroupListResponse, 400: ProblemDetail, 500: ProblemDetail },
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

export type get_FindBanners = __TypedOpenapi.Endpoints.get_FindBanners;
export const get_FindBanners = {
  method: z.literal("GET"),
  path: z.literal("/api/banners"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ slot: BannerSlot }) },
  responses: { 200: BannerListResponse, 400: ProblemDetail, 500: ProblemDetail },
};

export type get_FindWithdrawn = __TypedOpenapi.Endpoints.get_FindWithdrawn;
export const get_FindWithdrawn = {
  method: z.literal("GET"),
  path: z.literal("/api/auth/withdrawn"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: WithdrawnAccountResponse, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindRegisteredAccount = __TypedOpenapi.Endpoints.get_FindRegisteredAccount;
export const get_FindRegisteredAccount = {
  method: z.literal("GET"),
  path: z.literal("/api/auth/registered-account"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: RegisteredAccountResponse, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Preview = __TypedOpenapi.Endpoints.get_Preview;
export const get_Preview = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/users/{id}/restore-preview"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.coerce.number().int() }) },
  responses: { 200: AdminRecoveryPreviewResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Find_1 = __TypedOpenapi.Endpoints.get_Find_1;
export const get_Find_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/users/withdrawn"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ email: z.email().min(0).max(320), provider: OAuthProvider, status: RecoveryStatus, page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: AdminRecoveryPageResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_Summary = __TypedOpenapi.Endpoints.get_Summary;
export const get_Summary = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/users/withdrawn/summary"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: AdminRecoverySummaryResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindRestoreRequests = __TypedOpenapi.Endpoints.get_FindRestoreRequests;
export const get_FindRestoreRequests = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/users/restore-requests"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: AdminRestoreRequestPageResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindAll = __TypedOpenapi.Endpoints.get_FindAll;
export const get_FindAll = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/product-requests"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ status: ProductRequestStatus, page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: AdminProductRequestPageResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindById = __TypedOpenapi.Endpoints.get_FindById;
export const get_FindById = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/product-requests/{requestId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ requestId: z.uuid() }) },
  responses: { 200: AdminProductRequestResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Summary_1 = __TypedOpenapi.Endpoints.get_Summary_1;
export const get_Summary_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/notices/summary"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: AdminNoticeSummaryResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_Image_1 = __TypedOpenapi.Endpoints.get_Image_1;
export const get_Image_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/notices/images/{id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ id: z.uuid() }) },
  responses: { 200: z.custom<Blob>((v) => typeof Blob !== "undefined" && v instanceof Blob), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_FindMe_1 = __TypedOpenapi.Endpoints.get_FindMe_1;
export const get_FindMe_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/me"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ username: z.string() }).partial().optional() },
  responses: { 200: AdminSessionResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_Find_2 = __TypedOpenapi.Endpoints.get_Find_2;
export const get_Find_2 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/inquiries"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ q: z.string().min(0).max(200), status: FeedbackStatus, type: z.string(), assigned: z.coerce.boolean(), from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }), oldest: z.coerce.boolean().default(false), page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: AdminInquiryPageResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_Detail_2 = __TypedOpenapi.Endpoints.get_Detail_2;
export const get_Detail_2 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/inquiries/{kind}/{id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ kind: InquiryKind, id: z.uuid() }) },
  responses: { 200: AdminInquiryDetailResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Neighbors = __TypedOpenapi.Endpoints.get_Neighbors;
export const get_Neighbors = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/inquiries/{kind}/{id}/neighbors"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ q: z.string(), status: FeedbackStatus, type: z.string(), assigned: z.coerce.boolean(), from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }), oldest: z.coerce.boolean() }).partial().optional(), path: z.object({ kind: InquiryKind, id: z.uuid() }) },
  responses: { 200: AdminInquiryNeighborsResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Image_2 = __TypedOpenapi.Endpoints.get_Image_2;
export const get_Image_2 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/inquiries/{kind}/{id}/images/{imageId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ kind: InquiryKind, id: z.uuid(), imageId: z.uuid() }) },
  responses: { 200: z.custom<Blob>((v) => typeof Blob !== "undefined" && v instanceof Blob), 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_Summary_2 = __TypedOpenapi.Endpoints.get_Summary_2;
export const get_Summary_2 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/inquiries/summary"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: AdminInquirySummaryResponse, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindAll_1 = __TypedOpenapi.Endpoints.get_FindAll_1;
export const get_FindAll_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/feedbacks"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ status: FeedbackStatus, type: FeedbackSubjectType, page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) }).partial().optional() },
  responses: { 200: AdminFeedbackPageResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type get_FindById_1 = __TypedOpenapi.Endpoints.get_FindById_1;
export const get_FindById_1 = {
  method: z.literal("GET"),
  path: z.literal("/api/admin/feedbacks/{feedbackId}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.object({ feedbackId: z.uuid() }) },
  responses: { 200: AdminFeedbackResponse, 400: ProblemDetail, 401: ProblemDetail, 403: ProblemDetail, 404: ProblemDetail, 500: ProblemDetail },
};

export type get_StartSocialLogin = __TypedOpenapi.Endpoints.get_StartSocialLogin;
export const get_StartSocialLogin = {
  method: z.literal("GET"),
  path: z.literal("/api/oauth2/authorization/{provider}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.object({ returnOrigin: z.string(), channel: z.literal("app") }).partial().optional(), path: z.object({ provider: z.enum(["kakao", "google"]) }) },
  responses: { 302: z.unknown(), 404: ProblemDetail, 500: ProblemDetail },
  responseHeaders: { 302: z.object({ Location: z.string() }) },
};

export type post_Logout = __TypedOpenapi.Endpoints.post_Logout;
export const post_Logout = {
  method: z.literal("POST"),
  path: z.literal("/api/users/logout"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 204: z.unknown(), 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

export type post_AdminLogout = __TypedOpenapi.Endpoints.post_AdminLogout;
export const post_AdminLogout = {
  method: z.literal("POST"),
  path: z.literal("/api/admin/logout"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 204: z.unknown(), 401: ProblemDetail, 403: ProblemDetail, 500: ProblemDetail },
};

// </Endpoints>

     // <EndpointByMethod>
     export const EndpointByMethod: __TypedOpenapi.EndpointByMethod = {
     put: {
           "/api/users/me/wishlist/products/{productId}": put_AddToWishlist as any,
"/api/users/me/shelf/products/{productId}": put_Update as any,
"/api/push-tokens/enabled": put_ChangePushTokenEnabled as any,
"/api/admin/notices/{id}": put_Update_1 as any
         },
delete: {
           "/api/users/me/wishlist/products/{productId}": delete_RemoveFromWishlist as any,
"/api/users/me/shelf/products/{productId}": delete_Remove as any,
"/api/admin/notices/{id}": delete_Delete as any,
"/api/users/me/skin-filter/ingredients": delete_RemoveIngredients as any,
"/api/users/me": delete_Withdraw as any
         },
get: {
           "/api/admin/notices/{id}": get_Detail as any,
"/api/users/me/shelf/products": get_FindShelfProducts as any,
"/api/admin/notices": get_List as any,
"/api/users/me": get_FindMe as any,
"/api/users/me/wishlist/products": get_FindWishlistProducts as any,
"/api/users/me/skin-filter": get_FindSkinFilter as any,
"/api/users/me/shelf/product-suggestions": get_SuggestShelfProducts as any,
"/api/users/me/shelf/ingredient-analysis": get_AnalyzeIngredients as any,
"/api/users/me/products/{productId}": get_FindUserProduct as any,
"/api/skin-types": get_FindSkinTypes as any,
"/api/sitemap": get_FindContentUpdates as any,
"/api/search-keywords/rankings": get_Rankings as any,
"/api/products": get_FindProducts as any,
"/api/products/{productId}": get_FindProductDetail as any,
"/api/products/{productId}/similarities": get_Find as any,
"/api/products/suggestions": get_SuggestProducts as any,
"/api/products/share-matches": get_MatchSharedProduct as any,
"/api/products/related-keywords": get_RelatedKeywords as any,
"/api/products/rankings": get_FindRankings as any,
"/api/products/count": get_CountProducts as any,
"/api/notices": get_List_1 as any,
"/api/notices/{id}": get_Detail_1 as any,
"/api/notices/{id}/images/{imageId}": get_Image as any,
"/api/notices/banners": get_Banners as any,
"/api/ingredients": get_FindIngredients as any,
"/api/ingredients/{ingredientId}": get_FindIngredientDetail as any,
"/api/ingredients/suggestions": get_SuggestIngredients as any,
"/api/ingredient-groups": get_FindIngredientGroups as any,
"/api/ingredient-groups/{code}": get_FindIngredientGroup as any,
"/api/exclude-codes": get_FindExcludeCodes as any,
"/api/curations/{curationId}": get_FindCuration as any,
"/api/categories": get_FindCategories as any,
"/api/brands": get_FindBrands as any,
"/api/brands/{brandId}": get_FindBrand as any,
"/api/banners": get_FindBanners as any,
"/api/auth/withdrawn": get_FindWithdrawn as any,
"/api/auth/registered-account": get_FindRegisteredAccount as any,
"/api/admin/users/{id}/restore-preview": get_Preview as any,
"/api/admin/users/withdrawn": get_Find_1 as any,
"/api/admin/users/withdrawn/summary": get_Summary as any,
"/api/admin/users/restore-requests": get_FindRestoreRequests as any,
"/api/admin/product-requests": get_FindAll as any,
"/api/admin/product-requests/{requestId}": get_FindById as any,
"/api/admin/notices/summary": get_Summary_1 as any,
"/api/admin/notices/images/{id}": get_Image_1 as any,
"/api/admin/me": get_FindMe_1 as any,
"/api/admin/inquiries": get_Find_2 as any,
"/api/admin/inquiries/{kind}/{id}": get_Detail_2 as any,
"/api/admin/inquiries/{kind}/{id}/neighbors": get_Neighbors as any,
"/api/admin/inquiries/{kind}/{id}/images/{imageId}": get_Image_2 as any,
"/api/admin/inquiries/summary": get_Summary_2 as any,
"/api/admin/feedbacks": get_FindAll_1 as any,
"/api/admin/feedbacks/{feedbackId}": get_FindById_1 as any,
"/api/oauth2/authorization/{provider}": get_StartSocialLogin as any
         },
post: {
           "/api/users/me/wishlist/products/{productId}/restore": post_RestoreToWishlist as any,
"/api/users/me/skin-filter/ingredients": post_AddIngredients as any,
"/api/users/me/shelf/products": post_Add as any,
"/api/users/me/shelf/products/{productId}/restore": post_RestoreToShelf as any,
"/api/search-keywords": post_Record as any,
"/api/push-tokens": post_RegisterPushToken as any,
"/api/products/{productId}/views": post_IncreaseViewCount as any,
"/api/products/{productId}/correction-requests": post_SubmitProductCorrection as any,
"/api/products/registration-requests": post_Submit as any,
"/api/pending-images": post_UploadImages as any,
"/api/notices/{id}/views": post_View as any,
"/api/feedbacks": post_Submit_1 as any,
"/api/auth/{provider}/app-login": post_Login as any,
"/api/auth/withdrawn/restore": post_RequestRestore as any,
"/api/auth/signup": post_SignUp as any,
"/api/admin/users/{userId}/restore": post_Restore as any,
"/api/admin/notices": post_Create as any,
"/api/admin/notices/images": post_Upload as any,
"/api/admin/login": post_Login_1 as any,
"/api/admin/inquiries/{kind}/{id}/memos": post_Memo as any,
"/api/users/logout": post_Logout as any,
"/api/admin/logout": post_AdminLogout as any
         },
patch: {
           "/api/users/me/profile": patch_UpdateMyProfile as any,
"/api/admin/product-requests/{requestId}/status": patch_ChangeStatus as any,
"/api/admin/inquiries/{kind}/{id}/status": patch_Status as any,
"/api/admin/inquiries/{kind}/{id}/assignee": patch_Assign as any,
"/api/admin/inquiries/status": patch_BulkStatus as any,
"/api/admin/inquiries/assignee": patch_BulkAssign as any,
"/api/admin/feedbacks/{feedbackId}/status": patch_ChangeStatus_1 as any
         }
     }
     export type EndpointByMethod = __TypedOpenapi.EndpointByMethod;
     // </EndpointByMethod>

    // <EndpointByMethod.Shorthands>
    export type PutEndpoints = EndpointByMethod["put"]
export type DeleteEndpoints = EndpointByMethod["delete"]
export type GetEndpoints = EndpointByMethod["get"]
export type PostEndpoints = EndpointByMethod["post"]
export type PatchEndpoints = EndpointByMethod["patch"]
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
          "/api/pending-images": "form-data",
"/api/admin/notices/images": "form-data"
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

  // <ApiClient.put>
    put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<InferSuccessData<TEndpoint>>;

    put<Path extends keyof PutEndpoints, _TEndpoint extends PutEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("put", path, ...params);
    }
    // </ApiClient.put>

// <ApiClient.delete>
    delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse: true; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? InferSchemaInput<UParams> & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean; validate?: ValidateSide })
      >
    ): Promise<InferSuccessData<TEndpoint>>;

    delete<Path extends keyof DeleteEndpoints, _TEndpoint extends DeleteEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("delete", path, ...params);
    }
    // </ApiClient.delete>

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
