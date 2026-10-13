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
  const excludeCodes = [
    {
      code: "FRAGRANCE_ALLERGENS",
      name: "향료/알레르기 성분",
      englishName: null,
      description: "착향 목적의 성분이에요.",
      ingredients: [
        { id: 10, koreanName: "리모넨", englishName: null },
        { id: 11, koreanName: "리날룰", englishName: "Linalool" },
      ],
    },
    {
      code: "DRYING_ALCOHOLS",
      name: "건조 알코올",
      englishName: "Drying Alcohols",
      description: "피부를 건조하게 할 수 있는 알코올이에요.",
      ingredients: [{ id: 20, koreanName: "에탄올", englishName: "Alcohol" }],
    },
  ];

  it("이름이 달라도 같은 코드의 제외 성분군에서 제품 순서대로 포함 성분을 붙인다", () => {
    const [fragrance] = withCautionIngredients(
      [{ code: "FRAGRANCE_ALLERGENS", name: "향료", contains: true }],
      excludeCodes,
      [11, 3, 10],
    );

    expect(fragrance).toEqual({
      name: "향료",
      contains: true,
      code: "FRAGRANCE_ALLERGENS",
      ingredientIds: [11, 10],
    });
  });

  it("들어 있지 않은 기준은 상세 응답의 코드와 빈 성분 목록을 유지한다", () => {
    const [drying] = withCautionIngredients(
      [{ code: "DRYING_ALCOHOLS", name: "건조 알코올", contains: false }],
      excludeCodes,
      [11],
    );

    expect(drying).toEqual({ name: "건조 알코올", contains: false, code: "DRYING_ALCOHOLS", ingredientIds: [] });
  });

  it("이름이 같아도 코드가 다르면 포함 성분을 가져오지 않는다", () => {
    const [unknown] = withCautionIngredients(
      [{ code: "SYNTHETIC_COLORANTS", name: "향료/알레르기 성분", contains: false }],
      excludeCodes,
      [11],
    );

    expect(unknown).toEqual({
      code: "SYNTHETIC_COLORANTS",
      name: "향료/알레르기 성분",
      contains: false,
      ingredientIds: [],
    });
  });

  it("제외 성분군 목록이 비어 있어도 상세 응답의 코드를 유지한다", () => {
    const group = { code: "FRAGRANCE_ALLERGENS", name: "향료", contains: true };

    expect(withCautionIngredients([group], [], [11])).toEqual([{ ...group, ingredientIds: [] }]);
  });
});
