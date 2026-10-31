import { MyFilterResponse } from "@poudy/api/api.zod";
import { cookies } from "next/headers";
import { cache } from "react";

import { ApiError, apiGet } from "./client";
import { fetchProducts } from "./products";

import type { Filter } from "@/lib/domain/filter";
import { isMyFilterOn, MY_FILTER_COOKIE } from "@/lib/storage/my-filter-setting";

/** 세션 쿠키 이름. 스크립트는 못 읽고 서버만 요청 헤더에서 읽는다(HttpOnly). */
const SESSION_COOKIE = "JSESSIONID";

/**
 * 서버 렌더가 이번 요청에 나만의 필터를 적용할지. 설정 쿠키가 켬이고, 세션 쿠키로 읽은 회원의 필터에 성분이 있으면 적용한다.
 * 세션 쿠키는 로그인을 시작만 했거나 로그아웃·만료한 뒤에도 남으므로, 있기만 해서는 회원으로 보지 않는다.
 * 클라이언트가 회원 상태를 읽은 뒤 내리는 판단(myFilterRequested)과 같아야 칩과 첫 장이 바뀌지 않는다.
 * 설정 값도 함께 돌려줘 클라이언트 컴포넌트의 첫 그리기에 넘긴다. 한 요청 안에서는 한 번만 읽는다.
 */
export const readMyFilterForRequest = cache(async (): Promise<{ readonly on: boolean; readonly applied: boolean }> => {
  const jar = await cookies();
  const on = isMyFilterOn(jar.get(MY_FILTER_COOKIE)?.value);
  const session = jar.get(SESSION_COOKIE);
  if (!on || !session) return { on, applied: false };

  const applied = await apiGet("/api/users/me/my-filter", MyFilterResponse, {
    withSession: true,
    sessionCookie: `${SESSION_COOKIE}=${session.value}`,
    reportErrors: false,
  }).then(
    (filter) => filter.items.length > 0,
    () => false,
  );
  return { on, applied };
});

/** 서버 렌더와 장 범위 검사도 브라우저 요청과 같은 회원의 조건으로 조회한다. 세션이 없으면 부르지 않는다. */
export const fetchProductsForRequest = async (filter: Filter) => {
  if (!filter.myFilter) return fetchProducts(filter);
  const session = (await cookies()).get(SESSION_COOKIE);
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "나만의 필터를 적용하려면 로그인이 필요합니다.");
  return fetchProducts(filter, `JSESSIONID=${session.value}`);
};
