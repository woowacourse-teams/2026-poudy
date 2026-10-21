import { UserProductResponse } from "@poudy/api/api.zod";
import { cookies } from "next/headers";

import { apiGet } from "./client";
import { isAdminSession, isSignedOut } from "./member";

import { SIGNED_OUT_USER_PRODUCT, userProductWithout, type UserProductState } from "@/lib/domain/user-product";

export type { UserProductSaveState, UserProductState } from "@/lib/domain/user-product";

/**
 * 공통 제품 캐시와 분리해, 이번 요청의 회원 정보만 캐시 없이 읽는다.
 * 나에게 안 맞는 성분은 구성품마다 다르므로 제품 상세와 같은 partId 를 넘긴다. 없으면 서버가 첫 구성품을 고른다.
 */
export const fetchUserProduct = async (productId: number, partId?: number): Promise<UserProductState> => {
  const session = (await cookies()).get("JSESSIONID");
  if (!session) return SIGNED_OUT_USER_PRODUCT;

  const query = partId === undefined ? "" : `?partId=${partId}`;
  try {
    const response = await apiGet(`/api/users/me/products/${productId}${query}`, UserProductResponse, {
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
