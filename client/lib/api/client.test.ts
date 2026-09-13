import { afterEach, describe, expect, it, vi } from "vitest";

import { apiPost, apiUrl } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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

    await apiPost("/api/feedback", { content: "문의 내용" });

    expect(fetchMock).toHaveBeenCalledWith("https://api.example/api/feedback", {
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
