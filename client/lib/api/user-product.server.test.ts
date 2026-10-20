import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestCookies = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => requestCookies }));

import { fetchUserProduct } from "./user-product.server";

import { server } from "@/mocks/server";

const path = "*/api/users/me/products/:productId";

beforeEach(() => {
  requestCookies.get.mockReturnValue({ name: "JSESSIONID", value: "member-session" });
});
afterEach(() => vi.restoreAllMocks());

describe("SSR 회원별 제품 조회", () => {
  it("세션 쿠키가 없으면 회원 API를 호출하지 않는다", async () => {
    requestCookies.get.mockReturnValue(undefined);
    const fetch = vi.spyOn(globalThis, "fetch");
    await expect(fetchUserProduct(1)).resolves.toEqual({ status: "signedOut", wishlisted: false, shelved: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("이번 요청의 세션 쿠키만 전달하고 개인 응답은 캐시하지 않는다", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    server.use(
      http.get(path, ({ request }) => {
        expect(request.headers.get("cookie")).toBe("JSESSIONID=member-session");
        return HttpResponse.json({ wishlisted: true, shelved: true, similarProducts: [] });
      }),
    );
    await expect(fetchUserProduct(42)).resolves.toEqual({ status: "ready", wishlisted: true, shelved: true });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/me/products/42"),
      expect.objectContaining({
        cache: "no-store",
        credentials: "include",
      }),
    );
  });

  it("요청마다 현재 세션 쿠키를 전달한다", async () => {
    server.use(
      http.get(path, ({ request }) =>
        HttpResponse.json({
          wishlisted: request.headers.get("cookie") === "JSESSIONID=member-session",
          shelved: false,
          similarProducts: [],
        }),
      ),
    );
    expect((await fetchUserProduct(1)).wishlisted).toBe(true);
    requestCookies.get.mockReturnValue({ name: "JSESSIONID", value: "other-session" });
    expect((await fetchUserProduct(1)).wishlisted).toBe(false);
  });

  it.each([
    { code: 401, error: "UNAUTHORIZED", status: "signedOut" },
    { code: 403, error: "FORBIDDEN", status: "adminSession" },
  ])("$code 인증 오류를 버튼의 초기 인증 상태로 전달한다", async ({ code, error, status }) => {
    server.use(
      http.get(path, () => HttpResponse.json({ code: error, status: code, detail: "인증 오류" }, { status: code })),
    );
    await expect(fetchUserProduct(1)).resolves.toEqual({ status, wishlisted: false, shelved: false });
  });

  it("서버 장애를 저장하지 않았다는 값으로 바꾸지 않는다", async () => {
    server.use(http.get(path, () => HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 })));
    await expect(fetchUserProduct(1)).rejects.toMatchObject({ status: 500 });
  });
});
