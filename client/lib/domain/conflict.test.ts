import { describe, expect, it } from "vitest";

import {
  type ExcludeCodeIngredients,
  findConflicts,
  findContradictingIngredientIds,
  hasConflict,
  keepIncludedInstead,
  resolveLinkConflicts,
} from "./conflict";
import { EMPTY_FILTER, type Filter } from "./filter";

// 리모넨(101)과 리날룰(102)은 향료 성분군에 속한다.
const codeIngredients: ExcludeCodeIngredients = new Map([
  ["FRAGRANCE_ALLERGENS", [101, 102]],
  ["SULFATES", [131]],
]);

const filterWith = (changed: Partial<Filter>): Filter => ({ ...EMPTY_FILTER, ...changed });

describe("findConflicts", () => {
  it("검색으로 제외한 성분군의 성분을 포함하면 충돌이다", () => {
    const filter = filterWith({ excludeGroupCodes: ["CERAMIDES"], includeIngredientIds: [7130] });
    const groups: ExcludeCodeIngredients = new Map([["CERAMIDES", [7130, 8322]]]);

    expect(findConflicts(filter, groups)).toEqual([{ code: "CERAMIDES", ingredientIds: [7130] }]);
  });

  it("성분군을 제외하고 그 안의 성분을 포함하면 충돌이다", () => {
    const filter = filterWith({
      excludeCodes: ["FRAGRANCE_ALLERGENS"],
      includeIngredientIds: [101],
    });

    expect(findConflicts(filter, codeIngredients)).toEqual([{ code: "FRAGRANCE_ALLERGENS", ingredientIds: [101] }]);
  });

  it("성분군에 속하지 않은 성분은 충돌이 아니다", () => {
    const filter = filterWith({
      excludeCodes: ["FRAGRANCE_ALLERGENS"],
      includeIngredientIds: [6],
    });

    expect(findConflicts(filter, codeIngredients)).toEqual([]);
  });

  it("성분군만 제외하면 충돌이 아니다", () => {
    const filter = filterWith({ excludeCodes: ["FRAGRANCE_ALLERGENS"] });
    expect(hasConflict(filter, codeIngredients)).toBe(false);
  });

  it("모르는 성분군 코드는 충돌로 보지 않는다", () => {
    const filter = filterWith({
      excludeCodes: ["CYCLIC_SILICONES"],
      includeIngredientIds: [101],
    });

    expect(hasConflict(filter, codeIngredients)).toBe(false);
  });
});

describe("findContradictingIngredientIds", () => {
  it("같은 성분을 포함과 제외에 함께 넣으면 모순이다", () => {
    const filter = filterWith({ includeIngredientIds: [6, 7], excludeIngredientIds: [7] });
    expect(findContradictingIngredientIds(filter)).toEqual([7]);
  });

  it("겹치지 않으면 빈 목록이다", () => {
    const filter = filterWith({ includeIngredientIds: [6], excludeIngredientIds: [101] });
    expect(findContradictingIngredientIds(filter)).toEqual([]);
  });
});

describe("resolveLinkConflicts", () => {
  it("피하고 싶은 성분이 우선이라 원하는 성분 쪽을 뺀다", () => {
    const filter = filterWith({ excludeCodes: ["FRAGRANCE_ALLERGENS"], includeIngredientIds: [101, 7] });

    const { filter: resolved, removed } = resolveLinkConflicts(filter, codeIngredients);

    expect(resolved.includeIngredientIds).toEqual([7]);
    expect(resolved.excludeCodes).toEqual(["FRAGRANCE_ALLERGENS"]);
    expect(removed).toEqual([{ ingredientId: 101, code: "FRAGRANCE_ALLERGENS" }]);
  });

  it("같은 성분을 포함과 제외에 함께 넣으면 포함을 뺀다", () => {
    const filter = filterWith({ includeIngredientIds: [5], excludeIngredientIds: [5] });

    const { filter: resolved, removed } = resolveLinkConflicts(filter, codeIngredients);

    expect(resolved.includeIngredientIds).toEqual([]);
    expect(removed).toEqual([{ ingredientId: 5 }]);
  });

  it("부딪히는 것이 없으면 받은 조건을 그대로 돌려준다", () => {
    const filter = filterWith({ includeIngredientIds: [7] });

    expect(resolveLinkConflicts(filter, codeIngredients)).toEqual({ filter, removed: [] });
  });
});

describe("keepIncludedInstead", () => {
  it("뺀 원하는 성분을 되살리고 부딪힌 피하기 조건을 뺀다", () => {
    const filter = filterWith({ excludeCodes: ["FRAGRANCE_ALLERGENS", "SULFATES"], excludeIngredientIds: [5] });

    expect(
      keepIncludedInstead(filter, [{ ingredientId: 101, code: "FRAGRANCE_ALLERGENS" }, { ingredientId: 5 }]),
    ).toEqual({
      includeIngredientIds: [101, 5],
      excludeIngredientIds: [],
      excludeCodes: ["SULFATES"],
      excludeGroupCodes: [],
    });
  });
});
