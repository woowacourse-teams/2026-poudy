import type { ProductDetailResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import { breadcrumbList, itemList, productCrumbs, productStructuredData } from "./structured-data";

const variant = (price: number, status = "active") => ({ id: price, price, volumeValue: 50, volumeUnit: "ml", status });

const product = (overrides: Partial<ProductDetailResponse> = {}) =>
  ({
    id: 101,
    name: "수분 세럼",
    brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
    categories: [],
    imageUrl: "",
    variants: [],
    ...overrides,
  }) as unknown as ProductDetailResponse;

describe("구조화 데이터", () => {
  it("이동 경로는 홈에서 시작하고 절대 주소로 싣는다", () => {
    const data = breadcrumbList([{ name: "브랜드", path: "/brands" }]);

    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "홈", item: "http://localhost:3000/" },
      { "@type": "ListItem", position: 2, name: "브랜드", item: "http://localhost:3000/brands" },
    ]);
  });

  it("목록 번호는 목록 전체에서의 자리로 센다", () => {
    const data = itemList(
      [
        { id: 7, name: "토너" },
        { id: 8, name: "크림" },
      ],
      21,
    );

    expect(data.itemListElement.map((item) => [item.position, item.url])).toEqual([
      [21, "http://localhost:3000/products/7"],
      [22, "http://localhost:3000/products/8"],
    ]);
  });

  it("가격을 아는 옵션이 없으면 Product 를 싣지 않는다", () => {
    expect(productStructuredData(product())).toBeUndefined();
    expect(productStructuredData(product({ variants: [variant(0)] }))).toBeUndefined();
    expect(productStructuredData(product({ variants: [variant(18000, "discontinued")] }))).toBeUndefined();
  });

  it("가격이 하나면 Offer, 여럿이면 최저·최고가로 묶는다", () => {
    expect(productStructuredData(product({ variants: [variant(18000)] }))?.offers).toEqual({
      "@type": "Offer",
      price: 18000,
      priceCurrency: "KRW",
    });
    expect(productStructuredData(product({ variants: [variant(27000), variant(18000)] }))?.offers).toEqual({
      "@type": "AggregateOffer",
      lowPrice: 18000,
      highPrice: 27000,
      offerCount: 2,
      priceCurrency: "KRW",
    });
  });

  it("제품 이동 경로는 카테고리가 있으면 대분류와 소분류를, 없으면 브랜드를 거친다", () => {
    const categorized = product({ categories: [{ id: 4, name: "스킨케어", child: { id: 42, name: "세럼" } }] });

    expect(productCrumbs(categorized).map((crumb) => crumb.path)).toEqual([
      "/categories/4",
      "/categories/42",
      "/products/101",
    ]);
    expect(productCrumbs(product()).map((crumb) => crumb.path)).toEqual(["/brands/1", "/products/101"]);
  });
});
