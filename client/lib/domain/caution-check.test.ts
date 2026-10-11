import { describe, expect, it } from "vitest";

import { cautionSummary, sortedCautions, withCautionIngredients } from "./caution-check";

const groups = [
  { code: "DRYING_ALCOHOLS", name: "건조 알코올", contains: false },
  { code: "FRAGRANCE_ALLERGENS", name: "향료/알레르기 성분", contains: true },
  { code: "SULFATES", name: "설페이트 성분", contains: false },
  { code: "SYNTHETIC_COLORANTS", name: "합성 색소", contains: true },
];

describe("cautionSummary", () => {
  it("들어 있는 기준이 있으면 전체 중 몇 개인지 알린다", () => {
    expect(cautionSummary(groups)).toEqual({ contains: true, label: "4개 중 2개 포함" });
  });

  it("들어 있는 기준이 없으면 모두 없다고 알린다", () => {
    expect(cautionSummary(groups.map((group) => ({ ...group, contains: false })))).toEqual({
      contains: false,
      label: "4개 모두 없음",
    });
  });
});

describe("sortedCautions", () => {
  it("들어 있는 기준을 앞에 두고 같은 쪽끼리는 받은 순서를 지킨다", () => {
    expect(sortedCautions(groups).map((group) => group.name)).toEqual([
      "향료/알레르기 성분",
      "합성 색소",
      "건조 알코올",
      "설페이트 성분",
    ]);
  });
});

describe("withCautionIngredients", () => {
  const ingredients = [
    {
      id: 11,
      cautions: [
        { code: "FRAGRANCE_ALLERGENS", label: "향료" },
        { code: "SULFATES", label: "설페이트" },
      ],
    },
    { id: 3, cautions: [] },
    { id: 10, cautions: [{ code: "FRAGRANCE_ALLERGENS", label: "향료" }] },
  ];

  it("표시명이 달라도 코드로 해당 성분을 찾아 제품 순서를 유지한다", () => {
    const [fragrance] = withCautionIngredients(
      [{ code: "FRAGRANCE_ALLERGENS", name: "향료/알레르기 성분", contains: true }],
      ingredients,
    );

    expect(fragrance).toEqual({
      name: "향료/알레르기 성분",
      contains: true,
      code: "FRAGRANCE_ALLERGENS",
      ingredientIds: [11, 10],
    });
  });

  it("한 성분이 여러 기준에 들면 각 기준의 성분 목록에 포함한다", () => {
    const result = withCautionIngredients(
      [
        { code: "FRAGRANCE_ALLERGENS", name: "향료", contains: true },
        { code: "SULFATES", name: "설페이트", contains: true },
      ],
      ingredients,
    );

    expect(result.map((group) => group.ingredientIds)).toEqual([[11, 10], [11]]);
  });

  it("해당 성분이 없는 기준은 코드와 빈 성분 목록을 유지한다", () => {
    const group = { code: "DRYING_ALCOHOLS", name: "건조 알코올", contains: false };

    expect(withCautionIngredients([group], ingredients)).toEqual([{ ...group, ingredientIds: [] }]);
  });

  it("성분 목록이 비어도 상세 응답의 코드를 유지한다", () => {
    const group = { code: "FRAGRANCE_ALLERGENS", name: "향료", contains: false };

    expect(withCautionIngredients([group], [])).toEqual([{ ...group, ingredientIds: [] }]);
  });
});
