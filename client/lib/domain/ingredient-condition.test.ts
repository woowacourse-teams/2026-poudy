import { describe, expect, it } from "vitest";

import { EMPTY_FILTER, type Filter } from "./filter";
import {
  addedCount,
  addExcludeCode,
  addGroup,
  addIngredient,
  blockingExcludeCodes,
  clearIngredientConditions,
  hasIngredientCondition,
  includedIdsIn,
  ingredientConditionChanged,
  releaseExcludes,
  resolutionMessage,
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

describe("충돌을 바로 정리하는 담기(S33 · S33a · S35)", () => {
  const names = {
    ingredient: (id: number) => ({ 1: "레티놀", 2: "레티닐팔미테이트", 101: "리모넨" })[id] ?? `${id}`,
    group: (code: string) => ({ FRAGRANCE_ALLERGENS: "향료/알레르기 성분", RETINOL: "레티놀" })[code] ?? code,
  };

  it("반대쪽에 있던 성분은 옮겨 오고 그렇게 알린다", () => {
    const resolved = addIngredient(
      filterWith({ includeIngredientIds: [1] }),
      { condition: "exclude", id: 1 },
      new Map(),
    );

    expect(resolved.filter.includeIngredientIds).toEqual([]);
    expect(resolved.filter.excludeIngredientIds).toEqual([1]);
    expect(resolutionMessage(resolved, "exclude", { ...names, target: "레티놀" })).toBe(
      "레티놀을 원하는 성분에서 빼고 여기에 담았어요.",
    );
  });

  it("원하는 성분으로 담는 성분이 피하는 성분군에 있으면 피하기를 푼다", () => {
    const resolved = addIngredient(
      filterWith({ excludeCodes: ["FRAGRANCE_ALLERGENS"] }),
      { condition: "include", id: 101 },
      new Map([["FRAGRANCE_ALLERGENS", [101]]]),
    );

    expect(resolved.filter.excludeCodes).toEqual([]);
    expect(resolved.filter.includeIngredientIds).toEqual([101]);
    expect(resolutionMessage(resolved, "include", { ...names, target: "리모넨" })).toBe(
      "리모넨을 담으려고 ‘향료/알레르기 성분’ 피하기를 풀었어요.",
    );
  });

  it("부딪히지 않으면 아무것도 정리하지 않는다", () => {
    const resolved = addIngredient(EMPTY_FILTER, { condition: "include", id: 1 }, new Map());

    expect(resolutionMessage(resolved, "include", { ...names, target: "레티놀" })).toBe("");
  });

  it("피하는 성분군을 담으면 그 안의 원하는 성분을 빼고, 반대쪽에 있던 성분군은 옮겨 온다", () => {
    const resolved = addGroup(
      filterWith({ includeIngredientIds: [1, 5], includeGroupCodes: ["RETINOL"] }),
      "exclude",
      retinol,
    );

    expect(resolved.filter.includeIngredientIds).toEqual([5]);
    expect(resolved.filter.includeGroupCodes).toEqual([]);
    expect(resolved.filter.excludeGroupCodes).toEqual(["RETINOL"]);
    expect(resolutionMessage(resolved, "exclude", { ...names, target: "레티놀" })).toBe(
      "레티놀을 원하는 성분에서 빼고 여기에 담았어요. 레티놀은 ‘레티놀’에 들어 있어 원하는 성분에서 뺐어요.",
    );
  });

  it("자주 피하는 성분을 켜면 그 안의 원하는 성분을 뺀다", () => {
    const resolved = addExcludeCode(filterWith({ includeIngredientIds: [101, 1] }), "FRAGRANCE_ALLERGENS", [101, 102]);

    expect(resolved.filter.excludeCodes).toEqual(["FRAGRANCE_ALLERGENS"]);
    expect(resolved.filter.includeIngredientIds).toEqual([1]);
    expect(resolutionMessage(resolved, "exclude", { ...names, target: "향료/알레르기 성분" })).toBe(
      "리모넨은 ‘향료/알레르기 성분’에 들어 있어 원하는 성분에서 뺐어요.",
    );
  });
});
