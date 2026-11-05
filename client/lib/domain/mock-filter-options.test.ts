import { ProductCountResponse, ProductPageResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import { brands, categories } from "@/mocks/fixtures";

const products = async (query: string) =>
  ProductPageResponse.parse(await (await fetch(`http://localhost/api/products?${query}`)).json());

it.each([
  ["brandIds", "brands"],
  ["categoryIds", "categories"],
  ["skinType", "skinTypes"],
] as const)("목은 %s 전체만 제외해 %s를 계산한다", async (condition, field) => {
  for (const extra of [
    "",
    "keyword=토너",
    "moistureLevel=2",
    "oilLevel=1",
    "includeIngredientIds=1",
    "excludeIngredientIds=1",
    "excludeCodes=SULFATES",
  ]) {
    const query = new URLSearchParams(`brandIds=1,2&categoryIds=3,4&skinType=DRY&size=1&${extra}`);
    const response = await products(query.toString());
    query.delete(condition);
    const expected = await products(query.toString());
    expect(response.filterOptions?.[field]).toEqual(expected.filterOptions?.[field]);
  }
});

it("빈 결과에도 후보는 남을 수 있고 후속 페이지는 필드를 생략한다", async () => {
  const body: unknown = await (await fetch("http://localhost/api/products?brandIds=999999")).json();
  expect(body).not.toHaveProperty("brands");
  expect(body).not.toHaveProperty("categories");
  expect(body).not.toHaveProperty("skinTypes");
  const first = ProductPageResponse.parse(body);
  expect(first.items).toEqual([]);
  expect(first.filterOptions?.brands.length).toBeGreaterThan(1);
  expect(first.filterOptions?.categories).toEqual([]);
  expect(first.filterOptions?.sensitiveSkin).toBe(false);
  expect(first.selectedFilters).toEqual({ brands: [], categories: [] });
  const later = await products("page=2&size=1");
  expect(later).not.toHaveProperty("filterOptions");
  expect(later).not.toHaveProperty("selectedFilters");
});

it("목은 빈 결과에서도 선택 이름을 요청 순서대로 제공하고 없는 ID는 생략한다", async () => {
  const parent = categories[0];
  const child = parent.children[0];
  const response = await products(
    `brandIds=3,999999,1&categoryIds=${child.id},999999,${parent.id}&keyword=존재하지않는제품`,
  );
  expect(response.items).toEqual([]);
  expect(response.selectedFilters).toEqual({
    brands: [3, 1].flatMap((id) => brands.filter((brand) => brand.id === id).map(({ id, name }) => ({ id, name }))),
    categories: [child, parent].map(({ id, name }) => ({ id, name })),
  });
});

it("목도 피부 타입과 민감성을 OR로 결합하고 목록과 개수를 일치시킨다", async () => {
  const queries = ["skinType=DRY", "skinType=OILY", "sensitiveSkin=true"];
  const separate = await Promise.all(queries.map((query) => products(`${query}&size=10000`)));
  const combinedQuery = `${queries.join("&")}&size=10000`;
  const combined = await products(combinedQuery);
  const expected = new Set(separate.flatMap((result) => result.items.map((item) => item.id)));
  expect(new Set(combined.items.map((item) => item.id))).toEqual(expected);
  expect(combined.items).toHaveLength(expected.size);
  expect(combined.pagination.totalElements).toBe(expected.size);

  const count = ProductCountResponse.parse(
    await (await fetch(`http://localhost/api/products/count?${combinedQuery}`)).json(),
  );
  expect(count.count).toBe(expected.size);
  const branded = await products(`${combinedQuery}&brandIds=1`);
  expect(branded.items.length).toBeGreaterThan(0);
  expect(branded.items.every((item) => item.brand.id === 1)).toBe(true);
});

it("목의 피부 후보는 타입과 민감성 조건을 함께 제외한다", async () => {
  const baseline = await products("brandIds=1&keyword=토너");
  const filtered = await products("brandIds=1&keyword=토너&skinType=OILY&sensitiveSkin=true");
  expect(filtered.filterOptions?.skinTypes).toEqual(baseline.filterOptions?.skinTypes);
  expect(filtered.filterOptions?.sensitiveSkin).toBe(baseline.filterOptions?.sensitiveSkin);
});

describe("목의 마크 필터는 서버 규칙을 따른다", () => {
  const total = async (query: string) => (await products(query)).pagination.totalElements;
  const option = async (query: string, code: string) =>
    (await products(query)).filterOptions?.markGroups
      .flatMap((group) => group.options)
      .find((candidate) => candidate.code === code);

  it("자외선 차단 유형은 OR, 제품 특성은 AND, 두 그룹 사이는 AND 로 찾는다", async () => {
    const mineral = await total("marks=MINERAL");
    const organic = await total("marks=ORGANIC");
    expect(await total("marks=MINERAL&marks=ORGANIC")).toBe(mineral + organic);

    const easyWash = await total("marks=EASY_WASH");
    const both = await total("marks=EASY_WASH&marks=WATERPROOF");
    expect(both).toBeLessThan(easyWash);
    expect(await total("marks=MINERAL&marks=EASY_WASH")).toBeLessThan(mineral);
  });

  it("제품 특성의 후보 수는 자기 그룹의 선택을 뺀 값이고, 고른 값은 0개여도 남는다", async () => {
    expect(await option("marks=WATERPROOF", "EASY_WASH")).toEqual(await option("", "EASY_WASH"));
    expect(await option("keyword=존재하지않는제품&marks=DAISO", "DAISO")).toMatchObject({ productCount: 0 });
  });

  it("다이소는 받고, 정의에 없는 코드는 400 으로 거절한다", async () => {
    expect((await fetch("http://localhost/api/products?marks=DAISO")).status).toBe(200);
    const rejected = await fetch("http://localhost/api/products/count?marks=DAISO&marks=NOPE");
    expect(rejected.status).toBe(400);
  });
});
