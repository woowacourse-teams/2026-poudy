import { ProductCountResponse, ProductPageResponse, SkinOptionsResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import { brands, categories } from "@/mocks/fixtures";

const products = async (query: string) => {
  const body: unknown = await (await fetch(`http://localhost/api/products?${query}`)).json();
  expect(body).not.toHaveProperty("selectedFilters");
  return ProductPageResponse.parse(body);
};

type Options = NonNullable<ProductPageResponse["filterOptions"]>;
const positiveOptions = (options: Options["brands"] | Options["categories"] | Options["skinOptions"] | undefined) =>
  options
    ?.filter((option) => option.productCount > 0)
    .map((option) =>
      "children" in option
        ? { ...option, children: option.children.filter((child) => child.productCount > 0) }
        : option,
    );

it.each([
  ["brandIds", "brands"],
  ["categoryIds", "categories"],
  ["skinType", "skinOptions"],
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
    expect(positiveOptions(response.filterOptions?.[field])).toEqual(positiveOptions(expected.filterOptions?.[field]));
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
  expect(first.filterOptions?.skinOptions).toEqual([]);
  expect(body).not.toHaveProperty("selectedFilters");
  const later = await products("page=2&size=1");
  expect(later).not.toHaveProperty("filterOptions");
  expect(later).not.toHaveProperty("selectedFilters");
});

it("목은 빈 결과에도 선택 이름과 0개를 후보에 남기고 없는 ID는 생략한다", async () => {
  const parent = categories[0];
  const child = parent.children[0];
  const response = await products(
    `brandIds=3,999999,1&categoryIds=${child.id},999999,${parent.id}&keyword=존재하지않는제품`,
  );
  expect(response.items).toEqual([]);
  expect(response.filterOptions?.brands).toHaveLength(2);
  for (const id of [3, 1]) {
    expect(response.filterOptions?.brands.find((brand) => brand.id === id)).toMatchObject({
      id,
      name: brands.find((brand) => brand.id === id)?.name,
      productCount: 0,
    });
  }
  expect(response.filterOptions?.categories).toEqual([
    { ...parent, productCount: 0, children: [{ ...child, productCount: 0 }] },
  ]);
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
  expect(positiveOptions(filtered.filterOptions?.skinOptions)).toEqual(
    positiveOptions(baseline.filterOptions?.skinOptions),
  );
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

it("피부 선택지 정의는 민감성을 포함해 개수 없이 코드와 이름을 제공한다", async () => {
  const response = SkinOptionsResponse.parse(await (await fetch("http://localhost/api/skin-options")).json());
  expect(response.items.map((option) => option.code)).toEqual(["DRY", "OILY", "COMBINATION", "SENSITIVE"]);
  expect(response.items[3]).toEqual({ code: "SENSITIVE", name: "민감성" });
});

it("선택한 피부 타입과 민감성은 0개여도 이름을 유지하고 미선택 0개는 생략한다", async () => {
  const response = await products("keyword=존재하지않는제품&skinType=OILY&sensitiveSkin=true");
  expect(response.filterOptions?.skinOptions).toEqual([
    { code: "OILY", name: "지성", productCount: 0 },
    { code: "SENSITIVE", name: "민감성", productCount: 0 },
  ]);
  const empty = await products("keyword=존재하지않는제품");
  expect(empty.filterOptions?.skinOptions).toEqual([]);
});
