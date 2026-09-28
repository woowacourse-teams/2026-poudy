import { describe, expect, it } from "vitest";

import { EMPTY_FILTER, type Filter } from "./filter";
import { coveredIngredientIds, groupLabel, toggleGroup } from "./ingredient-groups";

const filterWith = (changed: Partial<Filter>): Filter => ({ ...EMPTY_FILTER, ...changed });

const ceramides = { code: "CERAMIDES", name: "세라마이드 계열", ingredientIds: [7130, 8322] };

describe("성분군 조건", () => {
  it("라벨은 이름 끝의 계열을 빼고 성분 수를 붙인다", () => {
    expect(groupLabel(ceramides)).toBe("세라마이드 2종");
  });

  it("포함을 고르면 제외 조건에서 같은 성분군을 뺀다", () => {
    expect(toggleGroup(filterWith({ excludeGroupCodes: ["CERAMIDES"] }), "includeGroupCodes", "CERAMIDES")).toEqual({
      includeGroupCodes: ["CERAMIDES"],
      excludeGroupCodes: [],
    });
  });

  it("이미 고른 쪽을 다시 누르면 뺀다", () => {
    expect(toggleGroup(filterWith({ includeGroupCodes: ["CERAMIDES"] }), "includeGroupCodes", "CERAMIDES")).toEqual({
      includeGroupCodes: [],
    });
  });

  it("고른 성분군에 속한 성분을 모은다", () => {
    const groups = new Map([["CERAMIDES", ceramides]]);

    expect([...coveredIngredientIds(filterWith({ excludeGroupCodes: ["CERAMIDES"] }), groups)]).toEqual([7130, 8322]);
    expect(coveredIngredientIds(EMPTY_FILTER, groups).size).toBe(0);
  });
});
