import { describe, expect, it } from "vitest";

import { toOriginPath } from "./origin-path";

describe("문의를 연 화면의 경로", () => {
  it("경로만 있으면 그대로 쓴다", () => {
    expect(toOriginPath("/products/123")).toBe("/products/123");
  });

  it("어떤 조건을 걸고 있었는지 알 수 있게 쿼리도 함께 담는다", () => {
    expect(toOriginPath("/products?include=123&exclude=789")).toBe("/products?include=123&exclude=789");
    expect(toOriginPath("/search?q=수분크림")).toBe("/search?q=수분크림");
  });

  it("500자를 넘으면 조건을 버리고 경로만 남긴다", () => {
    const long = "/products?include=" + "1".repeat(600);

    expect(toOriginPath(long)).toBe("/products");
  });

  it("조각 식별자는 브라우저 안에서만 쓰이므로 버린다", () => {
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
