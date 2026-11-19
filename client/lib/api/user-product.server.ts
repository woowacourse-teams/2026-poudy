import type { ProductSimilaritySort } from "@poudy/api/api.zod";
import { cookies } from "next/headers";

import { apiGet } from "./client";
import { isAdminSession, isSignedOut } from "./member";
import { UserProductWithGroups } from "./shared-ingredient-groups";

import { SIGNED_OUT_USER_PRODUCT, userProductWithout, type UserProductState } from "@/lib/domain/user-product";

export type { WishlistShelfState, UserProductState } from "@/lib/domain/user-product";

/**
 * 공통 제품 캐시와 분리해, 이번 요청의 회원 정보만 캐시 없이 읽는다.
 * 나에게 안 맞는 성분은 구성품마다 다르므로 제품 상세와 같은 partId 를 넘긴다. 없으면 서버가 첫 구성품을 고른다.
 *
 * 비슷한 제품의 나만의 필터 여부는 서버가 기본 3개만 준다. 유사템 결과처럼 더 많이 보여 주는 화면은 같은 개수·정렬을
 * similar 로 넘긴다.
 */
export const fetchUserProduct = async (
  productId: number,
  partId?: number,
  similar?: { readonly size: number; readonly sort: ProductSimilaritySort },
): Promise<UserProductState> => {
  const session = (await cookies()).get("JSESSIONID");
  if (!session) return SIGNED_OUT_USER_PRODUCT;

  const params = new URLSearchParams();
  if (partId !== undefined) params.set("partId", String(partId));
  if (similar) {
    params.set("size", String(similar.size));
    params.set("sort", similar.sort);
  }
  const query = params.size > 0 ? `?${params}` : "";
  try {
    const response = await apiGet(`/api/users/me/products/${productId}${query}`, UserProductWithGroups, {
      withSession: true,
      sessionCookie: `JSESSIONID=${session.value}`,
    });
    return { status: "ready", ...response };
  } catch (error: unknown) {
    if (isSignedOut(error)) return SIGNED_OUT_USER_PRODUCT;
    if (isAdminSession(error)) return userProductWithout("adminSession");
    throw error;
  }
};
