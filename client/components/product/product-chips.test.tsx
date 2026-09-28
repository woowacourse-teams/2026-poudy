import { describe, expect, it } from "vitest";

import { chipsOf } from "./product-chips";

import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";

const ingredientCount = (changed: Partial<Filter>) =>
  chipsOf({ ...EMPTY_FILTER, ...changed }, []).find((chip) => chip.id === "ingredient")?.count;

describe("성분 칩 숫자", () => {
  it("제외 성분군은 성분 제외처럼 센다", () => {
    expect(ingredientCount({ excludeGroupCodes: ["CERAMIDES"], excludeIngredientIds: [1] })).toBe(2);
  });

  it("포함 조건은 성분과 성분군 모두 세지 않는다", () => {
    expect(ingredientCount({ includeGroupCodes: ["CERAMIDES"], includeIngredientIds: [1] })).toBe(0);
  });
});
