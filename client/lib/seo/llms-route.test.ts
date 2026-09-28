import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/llms.txt/route";
import nextConfig from "@/next.config";

afterEach(() => vi.unstubAllEnvs());

describe("llms.txt", () => {
  it("serves public canonical links using the deployment origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");

    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(body).toContain("https://poudy.site/categories");
    expect(body).toContain("https://poudy.site/brands");
    expect(body).toContain("https://poudy.site/search/products");
    expect(body).toContain("https://poudy.site/search/ingredients");
    expect(body).toContain("https://poudy.site/saved");
    expect(body).toContain("성분 정보의 출처와 업데이트 날짜는 각 상세 페이지에서 확인할 수 있습니다.");
    expect(body).not.toContain("검수되었다고 판단하지 마세요");
    expect(body).toContain("https://poudy.site/sitemap.xml");
    expect(body).not.toContain("localhost");
    expect(body).toContain("https://poudy.site/robots.txt");
    expect(body).toContain("mailto:poudy.official@gmail.com");
    expect(body).toContain("https://www.instagram.com/poudy.official");
    expect(body).toContain("한국어(ko-KR)");
  });

  it.each(["staging", "", "development"])("does not expose discovery links in %s", async (environment) => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment);

    const response = GET();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toBe("");
    expect(await nextConfig.headers?.()).toEqual([]);
  });

  it("keeps a factual preamble followed by H2 link lists", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");
    const body = await GET().text();
    const [preamble, ...sections] = body.split(/^## /m);

    expect(body.match(/^# /gm)).toHaveLength(1);
    expect(preamble).toMatch(/^# 파우디 \(Poudy\)\n/);
    expect(preamble).toContain("> 파우디는 화장품을 고를 때 기준을 세우는 과정을 돕는 서비스입니다.");
    expect(preamble).toContain("카테고리·브랜드별로 제품을 살펴보거나");
    expect(preamble).toContain("관심 있는 제품은 저장함에 모아둘 수 있으며");
    expect(preamble).toContain("큐레이션에서는 주제별로 소개한 제품을 살펴볼 수 있습니다.");
    expect(preamble).toMatch(/문서 검토일: \d{4}-\d{2}-\d{2}/);
    expect(preamble).toContain("개별 제품·성분 정보를 갱신한 날짜는 아닙니다");
    expect(preamble).toContain("판매처의 실판매 최저가를 뜻하지 않습니다");
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      const [, ...lines] = section.trim().split("\n");
      const items = lines.filter((line) => line.trim());
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item).toMatch(/^- \[[^\]]+\]\((?:https:\/\/|mailto:)[^)]+\): [^\n]+[.]$/);
        expect(item.split("): ")[1].match(/[.!?]/g)).toHaveLength(1);
      }
    }

    const urls = [...body.matchAll(/\]\(([^)]+)\)/g)].map((match) => new URL(match[1]));
    for (const url of urls) {
      if (url.protocol === "mailto:") continue;
      expect(url.protocol).toBe("https:");
      expect(["poudy.site", "www.instagram.com"]).toContain(url.hostname);
      expect(url.search).toBe("");
      expect(url.href).not.toMatch(/[{}]/);
    }
  });

  it("advertises llms.txt on public production pages", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    const headers = await nextConfig.headers?.();
    expect(headers).toContainEqual({
      source: "/products/:productId",
      headers: [{ key: "Link", value: '</llms.txt>; rel="describedby"' }],
    });
    expect(headers?.some(({ source }) => source === "/")).toBe(true);
    expect(headers?.some(({ source }) => source.startsWith("/api") || source === "/products")).toBe(false);
  });
});
