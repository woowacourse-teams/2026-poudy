import { cookies } from "next/headers";

import { ApiError } from "./client";
import { fetchProducts } from "./products";

import type { Filter } from "@/lib/domain/filter";
import { isMyFilterOn, MY_FILTER_COOKIE } from "@/lib/storage/my-filter-setting";

/** 세션 쿠키 이름. 스크립트는 못 읽고 서버만 요청 헤더에서 읽는다(HttpOnly). */
const SESSION_COOKIE = "JSESSIONID";

/**
 * 서버 렌더가 이번 요청에 나만의 필터를 적용할지.
 * 설정 쿠키가 켬이고 세션 쿠키가 있으면 적용한다. 설정 값도 함께 돌려줘 클라이언트 컴포넌트의 첫 그리기에 넘긴다.
 */
export const readMyFilterForRequest = async (): Promise<{ readonly on: boolean; readonly applied: boolean }> => {
  const jar = await cookies();
  const on = isMyFilterOn(jar.get(MY_FILTER_COOKIE)?.value);
  return { on, applied: on && jar.has(SESSION_COOKIE) };
};

/** 서버 렌더와 장 범위 검사도 브라우저 요청과 같은 회원의 조건으로 조회한다. 세션이 없으면 부르지 않는다. */
export const fetchProductsForRequest = async (filter: Filter) => {
  if (!filter.myFilter) return fetchProducts(filter);
  const session = (await cookies()).get(SESSION_COOKIE);
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "나만의 필터를 적용하려면 로그인이 필요합니다.");
  return fetchProducts(filter, `JSESSIONID=${session.value}`);
};
