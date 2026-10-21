import type { UserProductResponse } from "@poudy/api/api.zod";

export type UserProductStatus = "ready" | "signedOut" | "adminSession";

/** 저장 버튼이 쓰는 회원 상태. 위시리스트·선반에 담았는지만 안다. */
export type UserProductSaveState = Pick<UserProductResponse, "wishlisted" | "shelved"> & {
  readonly status: UserProductStatus;
};

/**
 * 제품 상세가 서버에서 받는 회원 상태(#836). 저장 여부에 더해, 고른 구성품에 든 나만의 필터 성분과
 * 비슷한 제품마다 나만의 필터 성분이 들었는지를 함께 둔다(S60 나에게 안 맞는 성분).
 */
export type UserProductState = UserProductSaveState &
  Pick<UserProductResponse, "skinFilterEmpty" | "unsuitableIngredients" | "similarProducts">;

/** 회원 정보를 받지 못한 상태. 로그인 전과 관리자 세션은 저장 여부도 나만의 필터도 없다. */
export const userProductWithout = (status: Exclude<UserProductStatus, "ready">): UserProductState => ({
  status,
  wishlisted: false,
  shelved: false,
  skinFilterEmpty: true,
  unsuitableIngredients: [],
  similarProducts: [],
});

export const SIGNED_OUT_USER_PRODUCT = userProductWithout("signedOut");

/** 나만의 필터 성분이 든 비슷한 제품의 번호. 회원 응답에 없는 제품은 들지 않은 것으로 본다. */
export const skinFilterProductIdsOf = (state: UserProductState): readonly number[] =>
  state.similarProducts.filter((product) => product.containsSkinFilterIngredient).map((product) => product.id);
