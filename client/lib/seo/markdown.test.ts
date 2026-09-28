import type { IngredientDetailResponse, ProductDetailResponse } from "@poudy/api/api.zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { ingredientMarkdown, markdownAlternates, markdownResponse, productMarkdown } from "@/lib/seo/markdown";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://poudy.site");
});
afterEach(() => vi.unstubAllEnvs());

describe("Markdown detail views", () => {
  it("returns Markdown with the HTML canonical and prevents duplicate indexing", async () => {
    const response = await markdownResponse("312", "/products/312", {
      fetchDetail: async () => "제품",
      render: (text) => `# ${text}`,
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("# 제품");
    expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("Link")).toContain('<https://poudy.site/products/312>; rel="canonical"');
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it.each(["0", "-1", "abc", "1.5", "01", "9007199254740992"])(
    "rejects invalid ID %s without fetching",
    async (raw) => {
      const fetchDetail = vi.fn();
      expect((await markdownResponse(raw, "/products/1", { fetchDetail, render: String })).status).toBe(404);
      expect(fetchDetail).not.toHaveBeenCalled();
    },
  );

  it("distinguishes missing resources from temporary API failures", async () => {
    for (const [status, expected] of [
      [404, 404],
      [500, 503],
      [0, 503],
    ]) {
      const response = await markdownResponse("1", "/products/1", {
        fetchDetail: async () => {
          throw new ApiError(status, "ERROR", "error");
        },
        render: String,
      });
      expect(response.status).toBe(expected);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("keeps staging private and omits alternate links there", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
    const fetchDetail = vi.fn();
    expect((await markdownResponse("1", "/products/1", { fetchDetail, render: String })).status).toBe(404);
    expect(fetchDetail).not.toHaveBeenCalled();
    expect(markdownAlternates("/products/1")).toEqual({ canonical: "/products/1" });
  });

  it("advertises the matching production Markdown URL", () => {
    expect(markdownAlternates("/ingredients/1")).toEqual({
      canonical: "/ingredients/1",
      types: { "text/markdown": "/ingredients/1/markdown" },
    });
  });

  it("preserves ingredient order and escapes injected Markdown and HTML", () => {
    const product = {
      id: 312,
      name: "제품 <script>",
      brand: { name: "브랜드" },
      variants: [{ volumeValue: 100, volumeUnit: "ml", price: 12000 }],
      selectedPart: {
        ingredients: [
          { id: 2, koreanName: "정제수", englishName: "Water" },
          { id: 1, koreanName: "[성분]", englishName: "" },
        ],
      },
    } as unknown as ProductDetailResponse;
    const text = productMarkdown(product);
    expect(text).toContain("100ml: 정가 12,000원");
    expect(text).toContain("1. [정제수](https://poudy.site/ingredients/2)");
    expect(text).toContain("2. [\\[성분\\]](https://poudy.site/ingredients/1)");
    expect(text).not.toContain("<script>");
  });

  it("includes ingredient descriptions, sources and the actual update timestamp", () => {
    const ingredient = {
      id: 1,
      koreanName: "성분",
      englishName: "Ingredient",
      description: "설명입니다.",
      formulationRoles: [{ name: "보습제" }],
      skinEffects: [{ name: "보습" }],
      infoSources: ["정보 출처"],
      effectSources: ["작용 출처"],
      updatedAt: "2026-09-20T00:00:00Z",
    } as IngredientDetailResponse;
    const text = ingredientMarkdown(ingredient);
    expect(text).toContain("설명입니다\\.");
    expect(text).toContain("정보 출처");
    expect(text).toContain("작용 출처");
    expect(text).toContain(ingredient.updatedAt);
  });
});
