import { ProductCountResponse, ProductPageResponse } from "@poudy/api/api.zod";
import { expect, it } from "vitest";

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
    expect(response.filterOptions?.[field]).toEqual(
      field === "brands" ? expected.filterOptions?.brands : expected[field],
    );
  }
});

it("빈 결과에도 후보는 남을 수 있고 후속 페이지는 필드를 생략한다", async () => {
  const body: unknown = await (await fetch("http://localhost/api/products?brandIds=999999")).json();
  expect(body).not.toHaveProperty("brands");
  const first = ProductPageResponse.parse(body);
  expect(first.items).toEqual([]);
  expect(first.filterOptions?.brands.length).toBeGreaterThan(1);
  expect(first.filterOptions?.categories).toEqual([]);
  expect(first.filterOptions?.sensitiveSkin).toBe(false);
  const later = await products("page=2&size=1");
  expect(later).not.toHaveProperty("filterOptions");
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
