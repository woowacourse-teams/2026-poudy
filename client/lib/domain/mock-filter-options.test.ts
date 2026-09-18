import { ProductPageResponse } from "@poudy/api/api.zod";
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
    expect(response.filterOptions?.[field]).toEqual(expected[field]);
  }
});

it("빈 결과에도 후보는 남을 수 있고 후속 페이지는 필드를 생략한다", async () => {
  const first = await products("brandIds=999999");
  expect(first.items).toEqual([]);
  expect(first.brands).toEqual([]);
  expect(first.filterOptions?.brands.length).toBeGreaterThan(1);
  expect(first.filterOptions?.categories).toEqual([]);
  const later = await products("page=2&size=1");
  expect(later).not.toHaveProperty("filterOptions");
});
