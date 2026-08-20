import { describe, expect, it } from "vitest";

import { INGREDIENT_SEARCH_LIMIT, ingredientCountLabel } from "./ingredient-search";

describe("ingredientCountLabel", () => {
  it("상한보다 적게 오면 받은 건수를 그대로 말한다", () => {
    expect(ingredientCountLabel(0)).toBe("0개");
    expect(ingredientCountLabel(3)).toBe("3개");
  });

  it("상한만큼 오면 더 있을 수 있으므로 단정하지 않는다", () => {
    expect(ingredientCountLabel(INGREDIENT_SEARCH_LIMIT)).toBe(`${INGREDIENT_SEARCH_LIMIT}개 이상`);
  });

  it("상한이 어긋나 더 많이 와도 눈앞의 줄 수보다 적게 말하지 않는다", () => {
    expect(ingredientCountLabel(INGREDIENT_SEARCH_LIMIT + 5)).toBe(`${INGREDIENT_SEARCH_LIMIT + 5}개 이상`);
  });
});
