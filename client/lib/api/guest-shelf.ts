import {
  GuestIngredientAnalysisResponse,
  type IngredientAnalysisResponse,
  type ShelfProductInfoResponse,
  type ShelfProductResponse,
  type ShelfResponse,
  type ShelfUsageStatus,
} from "@poudy/api/api.zod";

import { apiPost, apiPostFor } from "./client";

import type { RatingDraft } from "@/lib/domain/shelf";
import {
  clearGuestShelf,
  findGuestShelfItem,
  type GuestShelfItem,
  putGuestShelfItem,
  readGuestShelf,
  removeGuestShelfItem,
} from "@/lib/storage/guest-shelf";

/*
 * 비로그인 선반. 항목은 이 탭의 sessionStorage 가 갖고, 서버는 평가로 성분 분석만 계산한다.
 * 선반 화면은 회원 선반과 같은 응답 모양을 받도록 여기서 맞춘다.
 */

/** 로그인하지 않은 것을 이미 안 상태. 알면 회원 API 를 부르지 않고 곧장 비로그인 선반을 쓴다. */
let guestShelfMode = false;

export const isGuestShelfMode = (): boolean => guestShelfMode;

export const enterGuestShelfMode = (): void => {
  guestShelfMode = true;
};

/** 로그인한 뒤에는 다시 회원 선반부터 부른다. */
export const leaveGuestShelfMode = (): void => {
  guestShelfMode = false;
};

export type GuestShelf = { readonly shelf: ShelfResponse; readonly analysis: IngredientAnalysisResponse };

const EMPTY_ANALYSIS: GuestIngredientAnalysisResponse = {
  badProductCount: 0,
  items: [],
  possiblyUnsuitableProductIds: [],
};

const analyze = (items: readonly GuestShelfItem[]): Promise<GuestIngredientAnalysisResponse> => {
  if (items.length === 0) return Promise.resolve(EMPTY_ANALYSIS);
  return apiPostFor("/api/shelf/ingredient-analysis", GuestIngredientAnalysisResponse, {
    items: items.map((item) => ({ productId: item.product.id, preference: item.rating.preference })),
  });
};

const countOf = (items: readonly GuestShelfItem[], status: ShelfUsageStatus) =>
  items.filter((item) => item.usageStatus === status).length;

const toResponse = (item: GuestShelfItem, possiblyUnsuitable: boolean): ShelfProductResponse => ({
  ...item,
  possiblyUnsuitable,
});

/** 비로그인 선반과 성분 분석. 탭 이름은 회원 선반 응답과 같다. */
export const fetchGuestShelf = async (): Promise<GuestShelf> => {
  const items = readGuestShelf();
  const { badProductCount, items: ingredients, possiblyUnsuitableProductIds } = await analyze(items);
  return {
    shelf: {
      usages: [
        { code: "ALL", name: "전체", count: items.length },
        { code: "IN_USE", name: "사용 중", count: countOf(items, "IN_USE") },
        { code: "USED", name: "사용했던", count: countOf(items, "USED") },
      ],
      items: items.map((item) => toResponse(item, possiblyUnsuitableProductIds.includes(item.product.id))),
    },
    analysis: { badProductCount, items: ingredients },
  };
};

const ratingOf = (draft: RatingDraft) => ({
  preference: draft.preference,
  moistureLevel: draft.moistureLevel,
  oilLevel: draft.oilLevel,
});

const infoOf = (product: ShelfProductInfoResponse): ShelfProductInfoResponse => ({
  id: product.id,
  name: product.name,
  brandName: product.brandName,
  marks: product.marks,
  imageUrl: product.imageUrl,
  sensorySupported: product.sensorySupported,
});

/** 담는다. 담긴 표시(안 맞을 수 있는지)는 선반을 다시 읽을 때 정해진다. */
export const addGuestShelfProduct = (
  product: ShelfProductInfoResponse,
  draft: RatingDraft,
  registeredAt = new Date().toISOString(),
): ShelfProductResponse => {
  const item: GuestShelfItem = {
    product: infoOf(product),
    usageStatus: draft.usageStatus,
    rating: ratingOf(draft),
    registeredAt,
  };
  putGuestShelfItem(item);
  return toResponse(item, false);
};

/** 사용 상태와 평가를 통째로 바꾼다. 담은 시각은 그대로 둔다. */
export const updateGuestShelfProduct = (productId: number, draft: RatingDraft): ShelfProductResponse => {
  const saved = findGuestShelfItem(productId);
  if (!saved) throw new Error(`비로그인 선반에 없는 제품이다. productId=${productId}`);
  const item: GuestShelfItem = { ...saved, usageStatus: draft.usageStatus, rating: ratingOf(draft) };
  putGuestShelfItem(item);
  return toResponse(item, false);
};

export const removeGuestShelfProduct = (productId: number): void => removeGuestShelfItem(productId);

export const isInGuestShelf = (productId: number): boolean => findGuestShelfItem(productId) !== undefined;

/**
 * 로그인한 뒤 비로그인 선반을 회원 선반으로 옮긴다. 옮기면 비운다.
 * 실패해도 거부하지 않는다. 항목을 남겨 두면 선반 화면에 들어올 때 다시 옮긴다.
 */
export const importGuestShelf = async (): Promise<void> => {
  leaveGuestShelfMode();
  const items = readGuestShelf();
  if (items.length === 0) return;
  try {
    await apiPost(
      "/api/users/me/shelf/products/import",
      {
        items: items.map((item) => ({
          productId: item.product.id,
          usageStatus: item.usageStatus,
          ...item.rating,
          registeredAt: item.registeredAt,
        })),
      },
      { withSession: true },
    );
    clearGuestShelf();
  } catch {
    return;
  }
};
