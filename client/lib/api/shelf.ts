import {
  IngredientAnalysisPreviewResponse,
  IngredientAnalysisResponse,
  type ShelfProductAddRequest,
  ShelfProductResponse,
  ShelfProductSuggestionPageResponse,
  type ShelfProductUpdateRequest,
  ShelfResponse,
} from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPostFor, apiPutFor } from "./client";

import type { ProductEntryPoint, ShelfMutationSource } from "@/lib/analytics/events";
import { shelfMutation, trackShelfAdded, trackShelfRating } from "@/lib/analytics/shelf";
import { track } from "@/lib/analytics/track";
import type { RatingDraft } from "@/lib/domain/shelf";

const PATH = "/api/users/me/shelf";

/** 파우치 제품 전부를 최근 등록순으로 받는다. 사용 상태 탭의 이름과 개수가 함께 온다. */
export const fetchShelf = (): Promise<ShelfResponse> =>
  apiGet(`${PATH}/products`, ShelfResponse, { withSession: true });

/** 안 맞았어요로 평가한 파우치 제품을 바탕으로 안 맞을 수 있는 성분을 받는다. */
export const fetchIngredientAnalysis = (): Promise<IngredientAnalysisResponse> =>
  apiGet(`${PATH}/ingredient-analysis`, IngredientAnalysisResponse, { withSession: true });

/**
 * 평가 시트의 결과 미리보기. 이 제품의 평가를 평가 없음 · 잘 맞았어요 · 안 맞았어요로 두었을 때의 성분 분석이다.
 * 아무것도 저장하지 않는다.
 */
export const fetchRatingPreview = (productId: number): Promise<IngredientAnalysisPreviewResponse> =>
  apiGet(`${PATH}/ingredient-analysis/preview`, IngredientAnalysisPreviewResponse, {
    withSession: true,
    query: new URLSearchParams({ productId: String(productId) }),
  });

/** 파우치에 담을 제품을 검색어로 찾는다. 제품 추가 화면의 자동완성이다. */
export const fetchShelfProductSuggestions = (keyword: string): Promise<ShelfProductSuggestionPageResponse> =>
  apiGet(`${PATH}/product-suggestions`, ShelfProductSuggestionPageResponse, {
    query: new URLSearchParams({ keyword }),
    withSession: true,
  });

/** 제품을 파우치에 담는다. 평가는 비워 둘 수 있다. 이미 담긴 제품이면 SHELF_PRODUCT_ALREADY_EXISTS 로 실패한다. */
type MutationOptions = {
  readonly source?: ShelfMutationSource;
  readonly reason?: "normal" | "undo";
  readonly previous?: RatingDraft;
  readonly ratingFlowId?: string;
  readonly entryPoint?: ProductEntryPoint;
};
export const addShelfProduct = (
  request: ShelfProductAddRequest,
  options: MutationOptions = {},
): Promise<ShelfProductResponse> => {
  const properties = shelfMutation(options.source ?? "shelf", request.productId, options);
  return apiPostFor(`${PATH}/products`, ShelfProductResponse, request).then((item) => {
    trackShelfAdded(item, properties);
    return item;
  });
};

/** 사용 상태와 평가를 통째로 바꾼다. 평가를 지울 때는 평가 값을 모두 비워 보낸다. */
export const updateShelfProduct = (
  productId: number,
  request: ShelfProductUpdateRequest,
  options: MutationOptions = {},
): Promise<ShelfProductResponse> => {
  const properties = shelfMutation(options.source ?? "shelf", productId, options);
  return apiPutFor(`${PATH}/products/${productId}`, ShelfProductResponse, request).then((item) => {
    trackShelfRating(item, options.previous, properties);
    return item;
  });
};

/** 파우치에서 빼고 평가도 함께 지운다. 파우치에 없는 제품이어도 성공한다. */
export const removeShelfProduct = (productId: number, options: MutationOptions = {}): Promise<void> => {
  const properties = shelfMutation(options.source ?? "shelf", productId, options);
  return apiDelete(`${PATH}/products/${productId}`).then(() => {
    track("shelf_product_removed", properties);
  });
};
