import { SkinTypeResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import type { SkinTypeCode } from "@/mocks/fixtures";
import { allProducts, productCategoryIds, productSkinTypes } from "@/mocks/fixtures";

/*
 * 목록 응답에 함께 오는 조건 후보가 결과와 어긋나지 않는지 지킨다.
 *
 * 서버는 `brands` 와 `categories`, `skinTypes` 를 `조회 조건에 해당하는 제품 전체` 를 기준으로
 * 내려준다. 페이지에 걸린 것이 아니라 조건에 걸린 것 전부다.
 *
 * 기존 최상위 집계의 호환성을 지킨다. 시트는 자기 조건을 제외한 filterOptions를 사용하며
 * 그 계산 계약은 mock-filter-options.test.ts에서 별도로 검증한다.
 *
 * 형태는 `mock-schema.test.ts` 가 지키므로 여기서는 담긴 값이 결과와 맞는지만 본다.
 */

const BASE = "http://localhost/api";

/**
 * 피부 타입 코드와 그 차례.
 *
 * 서버가 내려주는 차례는 이 정의 순서를 따르므로, 손으로 적지 않고 공용 스키마에서 가져와
 * API 가 바뀌면 테스트도 함께 따라가게 한다.
 */
const ALL_SKIN_TYPE_CODES: readonly SkinTypeCode[] = SkinTypeResponse.shape.code.options;

// 목 서버는 vitest.setup.ts 가 이미 띄워 둔다.
const fetchProducts = async (query: string) => {
  const response = await fetch(`${BASE}/products${query}`);

  return (await response.json()) as {
    items: { id: number; brand: { id: number } }[];
    pagination: { totalElements: number };
    brands: { id: number; name: string }[];
    categories: { id: number; name: string; productCount: number; children: { id: number; productCount: number }[] }[];
    skinTypes: { code: string; name: string }[];
  };
};

/**
 * 조건에 걸린 제품 전체를 얻는다.
 *
 * 응답의 `items` 는 한 페이지뿐이라 그것만 보면 뒷장의 브랜드를 놓친다. 전체를 기준으로
 * 삼아야 `페이지가 아니라 결과 전체` 라는 계약을 그대로 잴 수 있다.
 */
const allMatched = async (query: string) => {
  const first = await fetchProducts(query);
  const size = first.pagination.totalElements;
  const joiner = query === "" ? "?" : "&";

  return fetchProducts(`${query}${joiner}size=${Math.max(1, size)}`);
};

/** 조건마다 결과가 달라지도록 고른 것들. 하나라도 결과가 비면 검사가 헐거워진다. */
const QUERIES: readonly [name: string, query: string][] = [
  ["조건 없음", ""],
  ["검색어", "?keyword=토너"],
  ["브랜드", "?brandIds=1"],
  ["카테고리", "?categoryIds=3"],
  ["피부 타입", "?skinType=DRY"],
  ["유수분", "?moistureLevel=2"],
  ["빠른 필터", "?excludeCodes=SULFATES"],
];

describe("목록 응답의 조건 후보", () => {
  it.each(QUERIES)("%s — 결과에 있는 브랜드만 담는다", async (_name, query) => {
    const { items, brands } = await allMatched(query);

    const inResult = new Set(items.map((product) => product.brand.id));
    const offered = brands.map((brand) => brand.id);

    /* 결과에 없는 브랜드를 고르면 빈 목록이 나온다. 그런 선택지를 주지 않는다. */
    expect(offered.filter((id) => !inResult.has(id))).toEqual([]);
    /* 결과에 있는데 빠뜨리면 고를 길이 없어진다. */
    expect([...inResult].filter((id) => !offered.includes(id))).toEqual([]);
  });

  it.each(QUERIES)("%s — 결과에 있는 카테고리만 담는다", async (_name, query) => {
    const { items, categories } = await allMatched(query);

    const inResult = new Set(
      items.map((product) => productCategoryIds.get(product.id)).filter((id): id is number => id !== undefined),
    );
    const offered = categories.flatMap((category) => category.children.map((child) => child.id));

    expect(offered.filter((id) => !inResult.has(id))).toEqual([]);
    expect([...inResult].filter((id) => !offered.includes(id))).toEqual([]);
  });

  it.each(QUERIES)("%s — 카테고리의 제품 수가 실제와 같다", async (_name, query) => {
    const { items, categories } = await allMatched(query);

    const counted = new Map<number, number>();
    for (const product of items) {
      const categoryId = productCategoryIds.get(product.id);
      if (categoryId !== undefined) counted.set(categoryId, (counted.get(categoryId) ?? 0) + 1);
    }

    for (const category of categories) {
      for (const child of category.children) {
        expect(child.productCount).toBe(counted.get(child.id) ?? 0);
      }

      /* 대분류의 수는 딸린 소분류를 더한 값이다. */
      expect(category.productCount).toBe(sumChildren(category.children));
    }
  });

  /*
   * 한 제품이 여러 타입에 든다. 그래서 조건으로 건 타입만 담기는 것이 아니라, 걸린 제품이
   * 든 타입을 모두 합친 것이 담긴다. 건성으로 좁혀도 그 제품들이 민감성에도 든다면 민감성이
   * 함께 온다. 서버의 `skinTypesOf` 가 걸린 제품의 집합을 합치는 것과 같다.
   */
  it.each(QUERIES)("%s — 결과에 있는 피부 타입만 담는다", async (_name, query) => {
    const { items, skinTypes, pagination } = await allMatched(query);

    const inResult = items.map((product) => productSkinTypes.get(product.id) ?? []);
    const expected = ALL_SKIN_TYPE_CODES.filter((code) => inResult.some((codes) => codes.includes(code)));

    /* 걸린 제품이 든 타입은 모두 담고, 아무도 들지 않은 타입은 담지 않는다. */
    expect(skinTypes.map((type) => type.code)).toEqual(expected);

    /*
     * 어느 타입에도 들지 않는 제품만 걸리면 고를 것이 없다. 그런 경우가 아니라면 결과가
     * 있는데 선택지가 비어 있어서는 안 된다.
     */
    if (pagination.totalElements > 0 && inResult.some((codes) => codes.length > 0)) {
      expect(skinTypes.length).toBeGreaterThan(0);
    }
  });

  /*
   * 위 검사는 목 데이터가 한쪽으로 쏠려 있으면 헐거워진다. 모든 제품이 한 타입에만 든다면
   * 여러 타입에 드는 경우를 한 번도 지나가지 않고, 모든 제품이 네 타입에 다 든다면 좁혀지는
   * 것을 확인할 수 없다. 데이터가 실제와 닮은 생김새인지 여기에서 따로 지킨다.
   */
  it("한 타입에만 드는 제품과 여러 타입에 드는 제품이 모두 있다", () => {
    const sets = allProducts.map((product) => productSkinTypes.get(product.id) ?? []);

    expect(sets.some((codes) => codes.length === 1)).toBe(true);
    expect(sets.some((codes) => codes.length > 1)).toBe(true);
    /* 어느 타입에도 들지 않는 제품도 서버에는 있다(미분류). */
    expect(sets.some((codes) => codes.length === 0)).toBe(true);
    /* 네 타입이 저마다 딸린 제품을 가진다. 한 타입이 비면 그 조건을 확인할 수 없다. */
    for (const code of ALL_SKIN_TYPE_CODES) {
      expect(sets.some((codes) => codes.includes(code))).toBe(true);
    }
  });

  /* 고른 타입에 드는 제품만 남는지 본다. 후보만 맞고 목록이 걸러지지 않으면 뜻이 없다. */
  it.each([...ALL_SKIN_TYPE_CODES])("%s 조건이 목록을 실제로 거른다", async (code) => {
    const { items } = await allMatched(`?skinType=${code}`);

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((product) => (productSkinTypes.get(product.id) ?? []).includes(code))).toBe(true);
    expect(items.length).toBeLessThan(allProducts.length);
  });

  /*
   * 브랜드 디렉터리가 보여 주는 수다. 목록과 따로 놀면 `21개` 라고 적힌 브랜드를 눌렀을 때
   * 다른 수가 나온다.
   */
  it("브랜드 목록의 제품 수가 실제와 같다", async () => {
    const response = await fetch(`${BASE}/brands`);
    const { items } = (await response.json()) as { items: { id: number; name: string; productCount: number }[] };

    const counted = new Map<number, number>();
    for (const product of allProducts) {
      counted.set(product.brand.id, (counted.get(product.brand.id) ?? 0) + 1);
    }

    for (const brand of items) {
      expect(brand.productCount).toBe(counted.get(brand.id) ?? 0);
    }

    /* 제품이 하나도 없는 브랜드는 고를 것이 없으므로 두지 않는다. */
    expect(items.every((brand) => brand.productCount > 0)).toBe(true);
  });

  /*
   * 카테고리가 붙지 않은 제품이 있으면, 검색이 그 제품만 집었을 때 시트가 텅 빈 채로 열린다.
   * `?keyword=독도` 로 손으로 적은 제품 하나만 걸렸을 때 실제로 그랬다.
   */
  it("모든 제품에 소분류가 붙어 있다", () => {
    const missing = allProducts.filter((product) => productCategoryIds.get(product.id) === undefined);

    expect(missing.map((product) => `${product.id} ${product.name}`)).toEqual([]);
  });

  /* 이름으로 제품을 찾았을 때도 조건 시트를 채울 수 있어야 한다. */
  it("이름으로 하나만 걸려도 카테고리 시트가 비지 않는다", async () => {
    const { items, categories } = await allMatched(`?keyword=${encodeURIComponent("독도")}`);

    expect(items.length).toBeGreaterThan(0);
    expect(categories.flatMap((category) => category.children).length).toBeGreaterThan(0);
  });

  /* 소분류가 하나도 걸리지 않은 대분류는 고를 것이 없으므로 아예 두지 않는다. */
  it("걸린 소분류가 없는 대분류는 빼고 준다", async () => {
    const { categories } = await allMatched("?categoryIds=3");

    expect(categories.every((category) => category.children.length > 0)).toBe(true);
  });

  /*
   * 목이 조건을 흘려보내지 않는지 함께 본다. 후보만 맞고 목록이 걸러지지 않으면, 시트에서
   * 골라도 같은 목록이 그대로 남아 조건이 먹는 것처럼 보이지 않는다.
   */
  it("카테고리 조건이 목록을 실제로 거른다", async () => {
    const { items } = await allMatched("?categoryIds=3");

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((product) => productCategoryIds.get(product.id) === 3)).toBe(true);
    expect(items.length).toBeLessThan(allProducts.length);
  });
});

const sumChildren = (children: readonly { productCount: number }[]) =>
  children.reduce((sum, child) => sum + child.productCount, 0);
