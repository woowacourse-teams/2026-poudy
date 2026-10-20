import { UserProductResponse } from "@poudy/api/api.zod";
import { cookies } from "next/headers";

import { apiGet } from "./client";
import { isAdminSession, isSignedOut } from "./member";

export type UserProductState = UserProductResponse & {
  readonly status: "ready" | "signedOut" | "adminSession";
};

const signedOut: UserProductState = { status: "signedOut", wishlisted: false, shelved: false };

/** 공통 제품 캐시와 분리해, 이번 요청의 회원 정보만 캐시 없이 읽는다. */
export const fetchUserProduct = async (productId: number): Promise<UserProductState> => {
  const session = (await cookies()).get("JSESSIONID");
  if (!session) return signedOut;

  try {
    const response = await apiGet(`/api/users/me/products/${productId}`, UserProductResponse, {
      withSession: true,
      sessionCookie: `JSESSIONID=${session.value}`,
    });
    return { ...response, status: "ready" };
  } catch (error: unknown) {
    if (isSignedOut(error)) return signedOut;
    if (isAdminSession(error)) return { status: "adminSession", wishlisted: false, shelved: false };
    throw error;
  }
};
