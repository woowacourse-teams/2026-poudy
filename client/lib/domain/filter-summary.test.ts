import { describe, expect, it } from "vitest";

import { EMPTY_FILTER, type Filter } from "./filter";
import { countConditions, type IngredientNames, summarizeFilter } from "./filter-summary";

const names: IngredientNames = new Map([
  [6, "판테놀"],
  [101, "리모넨"],
]);

const filterWith = (changed: Partial<Filter>): Filter => ({ ...EMPTY_FILTER, ...changed });

describe("summarizeFilter", () => {
  it("디자인의 요약 문구를 만든다", () => {
    const filter = filterWith({
      includeIngredientIds: [6],
      excludeIngredientIds: [101],
      excludeCodes: ["SULFATES", "DRYING_ALCOHOLS"],
    });

    expect(summarizeFilter(filter, names)).toBe("판테놀 포함 · 리모넨 제외 · 빠른 필터 2개");
  });

  it("조건이 없으면 빈 문자열이다", () => {
    expect(summarizeFilter(EMPTY_FILTER, names)).toBe("");
  });

  it("이름을 모르는 성분은 ID 로 적는다", () => {
    expect(summarizeFilter(filterWith({ includeIngredientIds: [999] }), names)).toBe("성분 999 포함");
  });

  it("수분·유분은 범위로 적는다", () => {
    expect(summarizeFilter(filterWith({ moistureLevel: [1, 2, 3] }), names)).toBe("수분 낮음–높음");
    expect(summarizeFilter(filterWith({ oilLevel: [0] }), names)).toBe("유분 없음");
  });

  it("검색어를 앞에 둔다", () => {
    expect(summarizeFilter(filterWith({ keyword: "토너", brandIds: [1] }), names)).toBe("'토너' · 브랜드 1개");
  });
});

describe("countConditions", () => {
  it("조건이 없으면 0 이다", () => {
    expect(countConditions(EMPTY_FILTER)).toBe(0);
  });

  it("수분과 유분은 값이 몇 개든 각각 하나로 센다", () => {
    expect(countConditions(filterWith({ moistureLevel: [1, 2, 3], oilLevel: [0] }))).toBe(2);
  });

  it("나머지는 값의 개수로 센다", () => {
    const filter = filterWith({
      keyword: "토너",
      brandIds: [1, 2],
      excludeCodes: ["SULFATES"],
    });

    expect(countConditions(filter)).toBe(4);
  });
});
