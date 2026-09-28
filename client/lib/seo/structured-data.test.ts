import type { CurationDetailResponse, IngredientDetailResponse, ProductDetailResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import {
  breadcrumbList,
  collectionPageStructuredData,
  curationStructuredData,
  ingredientStructuredData,
  itemList,
  productCrumbs,
  productStructuredData,
} from "./structured-data";

const variant = (price: number, status = "active") => ({ id: price, price, volumeValue: 50, volumeUnit: "ml", status });

const product = (overrides: Partial<ProductDetailResponse> = {}) =>
  ({
    id: 101,
    name: "수분 세럼",
    brand: { id: 1, name: "파우디", englishName: "Poudy", imageUrl: "" },
    categories: [],
    imageUrl: "",
    variants: [],
    selectedPart: { ingredients: [], skinEffectGroups: [] },
    ...overrides,
  }) as unknown as ProductDetailResponse;

describe("구조화 데이터", () => {
  it("uses ingredient facts and the recorded update time without inventing source URLs", () => {
    const ingredient: IngredientDetailResponse = {
      id: 1,
      koreanName: "가공소금",
      englishName: "Processed Salt",
      description: "성분 설명",
      formulationRoles: [],
      skinEffects: [],
      groupCodes: [],
      productCount: 5,
      infoSources: ["정보 출처"],
      effectSources: ["정보 출처", "효과 출처"],
      updatedAt: "2026-09-01T00:00:00Z",
    };
    const data = ingredientStructuredData(ingredient);

    expect(data.description).toBe(ingredient.description);
    expect(data.mainEntity.name).toBe(ingredient.koreanName);
    expect(data.mainEntity.alternateName).toBe(ingredient.englishName);
    expect(data.dateModified).toBe(ingredient.updatedAt);
    expect(data.citation).toEqual(["정보 출처", "효과 출처"]);
    expect(data.url).toBe("http://localhost:3000/ingredients/1");
    expect(data.mainEntity["@id"]).toBe(`${data.url}#ingredient`);
  });

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

describe("additional structured data", () => {
  it("connects a collection to its own page URL and page-specific list positions", () => {
    const data = collectionPageStructuredData({
      path: "/brands/23?page=2",
      title: "Brand products",
      description: "Second page",
      products: [{ id: 7, name: "Toner" }],
      firstPosition: 21,
    });
    expect(data.url).toBe("http://localhost:3000/brands/23?page=2");
    expect(data["@id"]).toBe(`${data.url}#webpage`);
    expect(data.mainEntity.itemListElement).toEqual([
      { "@type": "ListItem", position: 21, name: "Toner", url: "http://localhost:3000/products/7" },
    ]);
  });
  it("identifies the product and shares its ingredient description", () => {
    const data = productStructuredData(product({ variants: [variant(18000)] }));
    expect(data?.["@id"]).toBe("http://localhost:3000/products/101#product");
    expect(data?.description).toBe("파우디 수분 세럼의 전성분 0개를 확인해 보세요.");
  });

  it("lists visible products in block order, including filter blocks", () => {
    const curation = {
      id: 1,
      title: "가을\n보습",
      description: "큐레이션 소개",
      blocks: [
        { type: "IMAGE", imageUrl: "/image.png" },
        { type: "PRODUCTS", products: [{ id: 7, name: "토너" }] },
        { type: "PRODUCTS_BY_FILTER", products: [{ product: { id: 8, name: "크림" }, filterIds: ["filter"] }] },
      ],
    } as unknown as CurationDetailResponse;
    const data = curationStructuredData(curation);
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.name).toBe("가을 보습");
    expect(data.description).toBe(curation.description);
    expect(data.mainEntity.itemListElement.map(({ position, url }) => [position, url])).toEqual([
      [1, "http://localhost:3000/products/7"],
      [2, "http://localhost:3000/products/8"],
    ]);
  });
});
