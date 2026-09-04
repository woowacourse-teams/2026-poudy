import { describe, expect, it } from "vitest";

import { toOriginPath } from "./origin-path";

describe("문의를 연 화면의 경로", () => {
  it("경로만 있으면 그대로 쓴다", () => {
    expect(toOriginPath("/products/123")).toBe("/products/123");
  });

  it("검색 조건이 함께 실려 가지 않도록 쿼리를 버린다", () => {
    expect(toOriginPath("/products?include=123&exclude=789")).toBe("/products");
    expect(toOriginPath("/search?q=수분크림")).toBe("/search");
  });

  it("조각 식별자도 버린다", () => {
    expect(toOriginPath("/products/1#ingredients")).toBe("/products/1");
  });

  it("값이 없으면 홈을 담는다", () => {
    expect(toOriginPath(null)).toBe("/");
    expect(toOriginPath(undefined)).toBe("/");
    expect(toOriginPath("")).toBe("/");
  });

  it("우리 화면의 경로가 아니면 홈을 담는다", () => {
    expect(toOriginPath("https://example.com/spam")).toBe("/");
    expect(toOriginPath("//example.com")).toBe("/");
    expect(toOriginPath("javascript:alert(1)")).toBe("/");
  });
});
