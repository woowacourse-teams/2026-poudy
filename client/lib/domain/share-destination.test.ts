import { describe, expect, it } from "vitest";

import { shareDestinationOf } from "./share-destination";

describe("shareDestinationOf", () => {
  it("제품을 확정하면 상세 경로로 보낸다", () => {
    expect(shareDestinationOf({ status: "MATCHED", productId: 30 })).toBe("/products/30");
  });

  it("확정하지 못해도 검색어가 남으면 목록에서 이어 찾게 한다", () => {
    expect(shareDestinationOf({ status: "NOT_FOUND", keyword: "토너" })).toBe("/products?keyword=%ED%86%A0%EB%84%88");
  });

  it("검색어에 섞인 특수 문자를 그대로 넘기지 않는다", () => {
    expect(shareDestinationOf({ status: "NOT_FOUND", keyword: "a&b=c" })).toBe("/products?keyword=a%26b%3Dc");
  });

  it("확정했다면서 제품 번호가 없으면 보낼 곳이 없다", () => {
    expect(shareDestinationOf({ status: "MATCHED" })).toBeNull();
  });

  it("찾지 못한 데다 검색어까지 없으면 보낼 곳이 없다", () => {
    expect(shareDestinationOf({ status: "NOT_FOUND", keyword: null })).toBeNull();
  });
});
