import { describe, expect, it } from "vitest";

import { INGREDIENT_SEARCH_LIMIT, ingredientCountLabel } from "./ingredient-search";

describe("ingredientCountLabel", () => {
  it("상한보다 적게 오면 받은 건수를 그대로 말한다", () => {
    expect(ingredientCountLabel(0)).toBe("0개");
    expect(ingredientCountLabel(3)).toBe("3개");
  });

  it("상한만큼 오면 그 몇 개가 전부가 아니라 골라 온 것임을 말한다", () => {
    expect(ingredientCountLabel(INGREDIENT_SEARCH_LIMIT)).toBe(`상위 ${INGREDIENT_SEARCH_LIMIT}개만`);
  });

  it("상한이 어긋나 더 많이 와도 눈앞의 줄 수보다 적게 말하지 않는다", () => {
    expect(ingredientCountLabel(INGREDIENT_SEARCH_LIMIT + 5)).toBe(`상위 ${INGREDIENT_SEARCH_LIMIT + 5}개만`);
  });
});
