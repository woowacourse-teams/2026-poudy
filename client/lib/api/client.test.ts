import { afterEach, describe, expect, it, vi } from "vitest";

import { apiUrl } from "./client";

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
