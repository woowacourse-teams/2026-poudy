import {
  IngredientAnalysisPreviewResponse,
  IngredientAnalysisResponse,
  type ShelfProductAddRequest,
  type ShelfProductInfoResponse,
  ShelfProductResponse,
  ShelfProductSuggestionPageResponse,
  type ShelfProductUpdateRequest,
  ShelfResponse,
} from "@poudy/api/api.zod";

import { apiDelete, apiGet, apiPostFor, apiPutFor } from "./client";
import {
  addGuestShelfProduct,
  enterGuestShelfMode,
  fetchGuestRatingPreview,
  fetchGuestShelf,
  isGuestShelfMode,
  removeGuestShelfProduct,
  updateGuestShelfProduct,
} from "./guest-shelf";
import { isSignedOut } from "./member";

import type { ProductEntryPoint, ShelfMutationSource } from "@/lib/analytics/events";
import { shelfMutation, trackShelfAdded, trackShelfRating } from "@/lib/analytics/shelf";
import { track } from "@/lib/analytics/track";
import type { RatingDraft } from "@/lib/domain/shelf";

const PATH = "/api/users/me/shelf";

/**
 * 회원 파우치를 쓰고, 로그인하지 않았으면 비로그인 파우치(guest-shelf)를 쓴다.
 * 로그인하지 않은 것을 한 번 알면 그 뒤로는 회원 API 를 부르지 않는다.
 */
const memberOrGuest = async <T>(member: () => Promise<T>, guest: () => T | Promise<T>): Promise<T> => {
  if (isGuestShelfMode()) return guest();
  try {
    return await member();
  } catch (error) {
    if (!isSignedOut(error)) throw error;
    enterGuestShelfMode();
    return guest();
  }
};

const draftOfRequest = (request: ShelfProductUpdateRequest): RatingDraft => ({
  usageStatus: request.usageStatus,
  preference: request.preference ?? null,
  moistureLevel: request.moistureLevel ?? null,
  oilLevel: request.oilLevel ?? null,
});

/** 회원 파우치 제품 전부를 최근 등록순으로 받는다. 사용 상태 탭의 이름과 개수가 함께 온다. */
export const fetchMemberShelf = (): Promise<ShelfResponse> =>
  apiGet(`${PATH}/products`, ShelfResponse, { withSession: true });

/** 회원 파우치에서 안 맞았어요로 평가한 제품을 바탕으로 안 맞을 수 있는 성분을 받는다. */
export const fetchIngredientAnalysis = (): Promise<IngredientAnalysisResponse> =>
  apiGet(`${PATH}/ingredient-analysis`, IngredientAnalysisResponse, { withSession: true });

/**
 * 평가 시트의 결과 미리보기. 이 제품의 평가를 평가 없음 · 잘 맞았어요 · 안 맞았어요로 두었을 때의 성분 분석이다.
 * 아무것도 저장하지 않는다. 로그인하지 않았으면 비로그인 파우치로 계산한다.
 */
export const fetchRatingPreview = (productId: number): Promise<IngredientAnalysisPreviewResponse> =>
  memberOrGuest(
    () =>
      apiGet(`${PATH}/ingredient-analysis/preview`, IngredientAnalysisPreviewResponse, {
        withSession: true,
        query: new URLSearchParams({ productId: String(productId) }),
      }),
    () => fetchGuestRatingPreview(productId),
  );

/** 파우치 제품 전부. 로그인하지 않았으면 비로그인 파우치다. */
export const fetchShelf = (): Promise<ShelfResponse> =>
  memberOrGuest(fetchMemberShelf, async () => (await fetchGuestShelf()).shelf);

/** 파우치에 담을 제품을 검색어로 찾는다. 제품 추가 화면의 자동완성이다. 로그인하지 않아도 쓴다. */
export const fetchShelfProductSuggestions = (keyword: string): Promise<ShelfProductSuggestionPageResponse> =>
  apiGet("/api/shelf/product-suggestions", ShelfProductSuggestionPageResponse, {
    query: new URLSearchParams({ keyword }),
  });

/** 제품을 파우치에 담는다. 평가는 비워 둘 수 있다. 이미 담긴 제품이면 SHELF_PRODUCT_ALREADY_EXISTS 로 실패한다. */
type MutationOptions = {
  readonly source?: ShelfMutationSource;
  readonly reason?: "normal" | "undo";
  readonly previous?: RatingDraft;
  readonly ratingFlowId?: string;
  readonly entryPoint?: ProductEntryPoint;
};
/** 비로그인 파우치에 담을 때 행에 그릴 제품 정보. 되돌리기로 다시 담을 때는 담았던 시각도 넘긴다. */
type GuestAddition = { readonly product: ShelfProductInfoResponse; readonly registeredAt?: string };
export const addShelfProduct = (
  request: ShelfProductAddRequest,
  options: MutationOptions & { readonly guest: GuestAddition },
): Promise<ShelfProductResponse> => {
  const properties = shelfMutation(options.source ?? "shelf", request.productId, options);
  return memberOrGuest(
    () => apiPostFor(`${PATH}/products`, ShelfProductResponse, request),
    () => addGuestShelfProduct(options.guest.product, draftOfRequest(request), options.guest.registeredAt),
  ).then((item) => {
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
  return memberOrGuest(
    () => apiPutFor(`${PATH}/products/${productId}`, ShelfProductResponse, request),
    () => updateGuestShelfProduct(productId, draftOfRequest(request)),
  ).then((item) => {
    trackShelfRating(item, options.previous, properties);
    return item;
  });
};

/** 파우치에서 빼고 평가도 함께 지운다. 파우치에 없는 제품이어도 성공한다. */
export const removeShelfProduct = (productId: number, options: MutationOptions = {}): Promise<void> => {
  const properties = shelfMutation(options.source ?? "shelf", productId, options);
  return memberOrGuest(
    () => apiDelete(`${PATH}/products/${productId}`),
    () => removeGuestShelfProduct(productId),
  ).then(() => {
    track("shelf_product_removed", properties);
  });
};
