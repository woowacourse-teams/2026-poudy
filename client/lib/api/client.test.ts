import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { apiGet, apiPost, apiUrl, INVALID_RESPONSE } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("API 주소", () => {
  it("서버에서는 로컬 전용 API 주소를 공개 주소보다 먼저 쓴다", () => {
    vi.stubEnv("POUDY_SERVER_API_BASE_URL", "http://127.0.0.1:8081");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://poudy.site");

    expect(apiUrl("/api/categories")).toBe("http://127.0.0.1:8081/api/categories");
  });

  it("서버 전용 주소가 없으면 공개 주소를 쓴다", () => {
    vi.stubEnv("POUDY_SERVER_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://poudy.site");

    expect(apiUrl("/api/products", new URLSearchParams({ page: "1" }))).toBe("https://poudy.site/api/products?page=1");
  });

  it("서버 주소가 모두 없으면 실행 중인 Next.js 주소를 쓴다", () => {
    vi.stubEnv("POUDY_SERVER_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("PORT", "3100");

    expect(apiUrl("/api/categories")).toBe("http://127.0.0.1:3100/api/categories");
  });

  it("브라우저에서는 서버 전용 주소를 노출하지 않고 공개 주소를 쓴다", () => {
    vi.stubGlobal("window", { location: { origin: "https://browser.example" } });
    vi.stubEnv("POUDY_SERVER_API_BASE_URL", "http://127.0.0.1:8081");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://poudy.site");

    expect(apiUrl("/api/categories")).toBe("https://poudy.site/api/categories");
  });

  it("브라우저 공개 주소가 비어 있으면 현재 origin을 쓴다", () => {
    vi.stubGlobal("window", { location: { origin: "https://browser.example" } });
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");

    expect(apiUrl("/api/categories")).toBe("https://browser.example/api/categories");
  });
});

describe("POST 요청", () => {
  const prepareFetch = () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("POUDY_SERVER_API_BASE_URL", "https://api.example");
    return fetchMock;
  };

  it("본문이 있으면 JSON으로 전송한다", async () => {
    const fetchMock = prepareFetch();

    await apiPost("/api/feedbacks", { content: "문의 내용" });

    expect(fetchMock).toHaveBeenCalledWith("https://api.example/api/feedbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "문의 내용" }),
    });
  });

  it("본문이 없으면 Content-Type과 body를 보내지 않는다", async () => {
    const fetchMock = prepareFetch();

    await apiPost("/api/products/42/views");

    expect(fetchMock).toHaveBeenCalledWith("https://api.example/api/products/42/views", { method: "POST" });
  });
});

describe("응답 검증", () => {
  const Item = z.object({ id: z.number(), name: z.string() });

  const respondWith = (body: unknown) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
    vi.stubEnv("POUDY_SERVER_API_BASE_URL", "https://api.example");
  };

  it("계약과 맞는 응답은 그대로 돌려준다", async () => {
    respondWith({ id: 1, name: "토너" });

    await expect(apiGet("/api/items/1", Item)).resolves.toEqual({ id: 1, name: "토너" });
  });

  it("production 이 아니면 계약과 다른 응답을 실패로 처리한다", async () => {
    respondWith({ id: 1, name: null });
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(apiGet("/api/items/1", Item)).rejects.toMatchObject({ status: 200, code: INVALID_RESPONSE });
  });

  it("production 에서는 계약과 다른 응답도 그대로 쓰고 어긋난 필드를 남긴다", async () => {
    respondWith({ id: 1, name: null });
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(apiGet("/api/items/1", Item)).resolves.toEqual({ id: 1, name: null });
    expect(JSON.parse(logged.mock.calls[0][0] as string)).toEqual({
      kind: "invalid_response",
      path: "/api/items/1",
      fields: ["name"],
    });
  });
});
