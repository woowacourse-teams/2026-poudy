import type { ProductComparisonPartResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import {
  attributeMarks,
  comparisonPartName,
  containedCautionNames,
  hasMyFilterVerdict,
  representativeVariant,
} from "./product-comparison";

const variant = (id: number, status: string) => ({ id, price: 1000, volumeValue: 50, volumeUnit: "ml", status });

const part = (overrides: Partial<ProductComparisonPartResponse> = {}): ProductComparisonPartResponse => ({
  id: 1,
  name: null,
  skinEffects: [],
  moistureLevel: null,
  oilLevel: null,
  cautionGroups: [],
  myFilterStatus: "GUEST",
  myFilterIngredients: [],
  ...overrides,
});

describe("representativeVariant", () => {
  it("판매 중인 첫 옵션을 고른다", () => {
    expect(representativeVariant([variant(1, "discontinued"), variant(2, "active")])?.id).toBe(2);
  });

  it("모두 단종이면 첫 옵션을, 옵션이 없으면 없음을 돌려준다", () => {
    expect(representativeVariant([variant(1, "discontinued"), variant(2, "discontinued")])?.id).toBe(1);
    expect(representativeVariant([])).toBeUndefined();
  });
});

describe("attributeMarks", () => {
  it("판매처 표시인 다이소를 빼고 제품 속성만 남긴다", () => {
    const marks = [
      { code: "MINERAL", name: "무기자차" },
      { code: "DAISO", name: "다이소" },
    ];
    expect(attributeMarks(marks)).toEqual([{ code: "MINERAL", name: "무기자차" }]);
  });
});

describe("containedCautionNames", () => {
  it("든 성분군의 이름만 돌려준다", () => {
    const cautionGroups = [
      { code: "A", name: "향료", contains: true, ingredients: [] },
      { code: "B", name: "색소", contains: false, ingredients: [] },
    ];
    expect(containedCautionNames(part({ cautionGroups }))).toEqual(["향료"]);
  });
});

describe("hasMyFilterVerdict", () => {
  it("판정이 하나라도 있으면 줄을 보인다", () => {
    expect(hasMyFilterVerdict([part({ myFilterStatus: "NO_MATCH" }), null])).toBe(true);
    expect(hasMyFilterVerdict([part({ myFilterStatus: "MATCH" })])).toBe(true);
  });

  it("로그인 전이거나 저장한 성분이 없거나 구성품이 없으면 줄을 숨긴다", () => {
    expect(hasMyFilterVerdict([part(), part({ myFilterStatus: "NO_FILTER" }), null])).toBe(false);
  });
});

describe("comparisonPartName", () => {
  it("이름이 없는 구성품은 순서로 부른다", () => {
    expect(comparisonPartName("1제", 0)).toBe("1제");
    expect(comparisonPartName(null, 1)).toBe("구성 2");
  });
});
