import { describe, expect, it } from "vitest";

import { EMPTY_FILTER, type Filter } from "./filter";
import { filterForOptions } from "./filter-options";

const filter: Filter = {
  ...EMPTY_FILTER,
  keyword: "크림",
  brandIds: [1, 2],
  categoryIds: [3, 4],
  skinType: "DRY",
  moistureLevel: [2],
  oilLevel: [1],
  includeIngredientIds: [1],
  excludeIngredientIds: [2],
  excludeCodes: ["SULFATES"],
  page: 4,
  size: 20,
  sort: "PRICE_DESC",
};

describe("시트의 후보 조회 조건", () => {
  it.each([
    ["brand", { brandIds: [] }],
    ["category", { categoryIds: [] }],
    ["skinType", { skinType: undefined }],
  ] as const)("%s 조건만 제외하고 다른 조건은 보존한다", (facet, omitted) => {
    expect(filterForOptions(filter, facet)).toEqual({
      ...filter,
      ...omitted,
      page: 0,
      size: 1,
      sort: "NAME_ASC",
    });
    expect(filter.brandIds).toEqual([1, 2]);
    expect(filter.categoryIds).toEqual([3, 4]);
    expect(filter.skinType).toBe("DRY");
  });
});
