import { describe, expect, it } from "vitest";

import { EMPTY_FILTER, type Filter } from "./filter";
import {
  addedCount,
  blockingExcludeCodes,
  clearIngredientConditions,
  hasIngredientCondition,
  includedIdsIn,
  ingredientConditionChanged,
  releaseExcludes,
  toggleGroupCondition,
  toggleIngredient,
} from "./ingredient-condition";

const filterWith = (changed: Partial<Filter>): Filter => ({ ...EMPTY_FILTER, ...changed });

// 레티놀(1)과 레티닐팔미테이트(2)는 레티놀 성분군에 든다.
const retinol = { code: "RETINOL", name: "레티놀", ingredientIds: [1, 2] };

describe("toggleIngredient", () => {
  it("담으면 다른 쪽에서 옮겨 온다", () => {
    const next = toggleIngredient(filterWith({ excludeIngredientIds: [1] }), "include", 1);

    expect(next.includeIngredientIds).toEqual([1]);
    expect(next.excludeIngredientIds).toEqual([]);
  });

  it("이미 담긴 것을 다시 누르면 뺀다", () => {
    expect(toggleIngredient(filterWith({ includeIngredientIds: [1, 3] }), "include", 1).includeIngredientIds).toEqual([
      3,
    ]);
  });
});

describe("toggleGroupCondition", () => {
  it("성분군을 담으면 그 성분군에 든 성분을 하나로 묶는다", () => {
    const { filter, absorbedIds } = toggleGroupCondition(
      filterWith({ excludeIngredientIds: [1, 9] }),
      "exclude",
      retinol,
    );

    expect(filter.excludeGroupCodes).toEqual(["RETINOL"]);
    expect(filter.excludeIngredientIds).toEqual([9]);
    expect(absorbedIds).toEqual([1]);
  });

  it("성분군을 빼면 묶은 것이 없다", () => {
    const { filter, absorbedIds } = toggleGroupCondition(
      filterWith({ excludeGroupCodes: ["RETINOL"] }),
      "exclude",
      retinol,
    );

    expect(filter.excludeGroupCodes).toEqual([]);
    expect(absorbedIds).toEqual([]);
  });
});

describe("blockingExcludeCodes", () => {
  const excluded = new Map([
    ["FRAGRANCE_ALLERGENS", [101]],
    ["AHA", [7]],
  ]);

  it("자주 피하는 성분과 피하는 성분군 모두에서 찾는다", () => {
    const filter = filterWith({ excludeCodes: ["FRAGRANCE_ALLERGENS"], excludeGroupCodes: ["AHA"] });

    expect(blockingExcludeCodes(filter, 101, excluded)).toEqual(["FRAGRANCE_ALLERGENS"]);
    expect(blockingExcludeCodes(filter, 7, excluded)).toEqual(["AHA"]);
    expect(blockingExcludeCodes(filter, 8, excluded)).toEqual([]);
  });

  it("풀면 두 목록에서 모두 뺀다", () => {
    const filter = filterWith({ excludeCodes: ["FRAGRANCE_ALLERGENS"], excludeGroupCodes: ["AHA"] });
    const released = releaseExcludes(filter, ["FRAGRANCE_ALLERGENS", "AHA"]);

    expect(released.excludeCodes).toEqual([]);
    expect(released.excludeGroupCodes).toEqual([]);
  });
});

describe("addedCount", () => {
  it("새로 담은 성분과 성분군만 센다", () => {
    const original = filterWith({ includeIngredientIds: [1] });
    const draft = filterWith({ includeIngredientIds: [1, 2], includeGroupCodes: ["X"] });

    expect(addedCount(original, draft, "include")).toBe(2);
    expect(addedCount(original, draft, "exclude")).toBe(0);
  });
});

describe("ingredientConditionChanged", () => {
  it("순서만 다르면 바뀌지 않은 것으로 본다", () => {
    expect(
      ingredientConditionChanged(
        filterWith({ includeIngredientIds: [1, 2] }),
        filterWith({ includeIngredientIds: [2, 1] }),
      ),
    ).toBe(false);
    expect(ingredientConditionChanged(filterWith({}), filterWith({ excludeCodes: ["SULFATES"] }))).toBe(true);
  });
});

it("includedIdsIn 은 그 성분군에 든 원하는 성분만 돌려준다", () => {
  expect(includedIdsIn(filterWith({ includeIngredientIds: [101, 5] }), [101, 102])).toEqual([101]);
});

it("clearIngredientConditions 는 성분 조건만 비운다", () => {
  const cleared = clearIngredientConditions(
    filterWith({ includeIngredientIds: [1], excludeCodes: ["SULFATES"], categoryIds: [3] }),
  );

  expect(hasIngredientCondition(cleared)).toBe(false);
  expect(cleared.categoryIds).toEqual([3]);
});
