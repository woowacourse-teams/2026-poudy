import { beforeEach, expect, it, vi } from "vitest";

const { requestCookies, api } = vi.hoisted(() => ({
  requestCookies: { get: vi.fn() },
  api: { fetchProducts: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => requestCookies }));
vi.mock("./products", () => api);

import { fetchProductsForRequest } from "./products.server";

import { EMPTY_FILTER } from "@/lib/domain/filter";

beforeEach(() => {
  api.fetchProducts.mockReset();
  requestCookies.get.mockReset();
});

it("켜진 SSR 요청마다 현재 세션 쿠키를 전달한다", async () => {
  const filter = { ...EMPTY_FILTER, myFilter: true };
  requestCookies.get.mockReturnValue({ value: "first" });
  await fetchProductsForRequest(filter);
  expect(api.fetchProducts).toHaveBeenLastCalledWith(filter, "JSESSIONID=first");
  requestCookies.get.mockReturnValue({ value: "second" });
  await fetchProductsForRequest(filter);
  expect(api.fetchProducts).toHaveBeenLastCalledWith(filter, "JSESSIONID=second");
});

it("세션이 없으면 API를 부르지 않고 로그인이 필요하다고 실패한다", async () => {
  await expect(fetchProductsForRequest({ ...EMPTY_FILTER, myFilter: true })).rejects.toMatchObject({ status: 401 });
  expect(api.fetchProducts).not.toHaveBeenCalled();
});

it("꺼진 요청은 쿠키를 읽지 않고 공통 목록을 쓴다", async () => {
  await fetchProductsForRequest(EMPTY_FILTER);
  expect(requestCookies.get).not.toHaveBeenCalled();
  expect(api.fetchProducts).toHaveBeenCalledWith(EMPTY_FILTER);
});

it("회원 필터의 인증 실패를 일반 결과로 바꾸지 않는다", async () => {
  const error = new Error("UNAUTHORIZED");
  requestCookies.get.mockReturnValue({ value: "expired" });
  api.fetchProducts.mockRejectedValue(error);
  await expect(fetchProductsForRequest({ ...EMPTY_FILTER, myFilter: true })).rejects.toBe(error);
});
