import { cookies } from "next/headers";

import { ApiError } from "./client";
import { fetchProducts } from "./products";

import type { Filter } from "@/lib/domain/filter";

/** 서버 렌더와 장 범위 검사도 브라우저 요청과 같은 회원의 조건으로 조회한다. 세션이 없으면 부르지 않는다. */
export const fetchProductsForRequest = async (filter: Filter) => {
  if (!filter.myFilter) return fetchProducts(filter);
  const session = (await cookies()).get("JSESSIONID");
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "나만의 필터를 적용하려면 로그인이 필요합니다.");
  return fetchProducts(filter, `JSESSIONID=${session.value}`);
};
