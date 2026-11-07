import type { IngredientAnalysisItemResponse, ShelfProductResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import {
  analysisGroups,
  clearedDraft,
  excludeRowNote,
  ingredientsToExclude,
  initialExcludeSelection,
  isRated,
  movedDraft,
  ratingBadge,
  ratingLevelMark,
  ratingLevelText,
  ratingSummary,
  shelfSections,
  summarizeAnalysis,
} from "./shelf";

const item = (id: number, overrides: Partial<ShelfProductResponse> = {}): ShelfProductResponse => ({
  product: { id, name: `제품 ${id}`, brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true },
  usageStatus: "IN_USE",
  rating: { preference: null, moistureLevel: null, oilLevel: null },
  possiblyUnsuitable: false,
  registeredAt: "2026-10-10T16:30:00+09:00",
  ...overrides,
});

const ingredient = (
  id: number,
  overrides: Partial<IngredientAnalysisItemResponse> = {},
): IngredientAnalysisItemResponse => ({
  id,
  koreanName: `성분 ${id}`,
  formulationRoles: [],
  groupCodes: [],
  reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }],
  products: [{ id: 1, name: "제품", imageUrl: "" }],
  inFilter: false,
  isNew: false,
  ...overrides,
});

describe("평가 표시", () => {
  it("남긴 수분감과 유분감만 이어 적는다", () => {
    expect(ratingSummary({ preference: "GOOD", moistureLevel: 2.5, oilLevel: 1 })).toBe("수분감 2.5 · 유분감 1");
    expect(ratingSummary({ preference: "GOOD", moistureLevel: null, oilLevel: 0 })).toBe("유분감 0");
    expect(ratingSummary({ preference: "GOOD", moistureLevel: null, oilLevel: null })).toBeUndefined();
  });

  it("평가를 하나도 남기지 않았을 때만 평가 전으로 본다", () => {
    expect(isRated({ preference: null, moistureLevel: null, oilLevel: null })).toBe(false);
    expect(isRated({ preference: null, moistureLevel: 0, oilLevel: null })).toBe(true);
  });

  it("맞았는지 고른 경우에만 배지를 단다", () => {
    expect(ratingBadge({ preference: "BAD", moistureLevel: null, oilLevel: null })).toBe("bad");
    expect(ratingBadge({ preference: null, moistureLevel: 1, oilLevel: 1 })).toBeUndefined();
  });
});

describe("shelfSections", () => {
  const items = [item(1), item(2, { usageStatus: "USED" }), item(3)];

  it("전체 탭은 사용 상태별로 머리를 달아 나눈다", () => {
    expect(shelfSections(items, "ALL")).toEqual([
      { heading: "사용 중 · 2", items: [items[0], items[2]] },
      { heading: "사용 완료 · 1", items: [items[1]] },
    ]);
  });

  it("빈 묶음은 빼고, 한 상태만 보는 탭은 머리 없이 둔다", () => {
    expect(shelfSections([item(1)], "ALL")).toHaveLength(1);
    expect(shelfSections(items, "USED")).toEqual([{ items: [items[1]] }]);
  });
});

describe("후보 선정 근거별 묶음", () => {
  it("서버의 근거 이름을 쓰고 여러 근거의 성분도 전체 개수와 선택에서는 한 번만 센다", () => {
    const shared = ingredient(1, {
      reasons: [
        { code: "SENSITIVE_SKIN", name: "서버 민감성 후보" },
        { code: "QUICK_EXCLUDE", name: "서버 빠른 제외 후보" },
        { code: "DRY_SKIN", name: "서버 건성 후보" },
      ],
      isNew: true,
    });
    const oily = ingredient(2, { reasons: [{ code: "OILY_SKIN", name: "서버 지성 후보" }] });
    const items = [shared, oily];

    expect(
      analysisGroups(items).map(({ reason, items: grouped }) => [reason.name, grouped.map((item) => item.id)]),
    ).toEqual([
      ["서버 빠른 제외 후보", [1]],
      ["서버 건성 후보", [1]],
      ["서버 지성 후보", [2]],
      ["서버 민감성 후보", [1]],
    ]);
    expect(summarizeAnalysis(items, { filterCount: 0, badProductCount: 1, hasSkinType: true }).newCount).toBe(1);
    expect(initialExcludeSelection(items)).toEqual([1, 2]);
    expect(ingredientsToExclude(items, [1, 2])).toEqual([1, 2]);
  });

  it("성분이 없는 근거는 묶음을 만들지 않는다", () => {
    expect(analysisGroups([])).toEqual([]);
    expect(analysisGroups([ingredient(1)]).map(({ reason }) => reason.code)).toEqual(["QUICK_EXCLUDE"]);
  });
});

describe("summarizeAnalysis", () => {
  it("검색에서 제외 중인 성분이 없으면 모두 고르는 버튼을 둔다(S52)", () => {
    expect(
      summarizeAnalysis([ingredient(1), ingredient(2)], { filterCount: 0, badProductCount: 2, hasSkinType: false }),
    ).toMatchObject({
      pickLabel: "검색에서 제외할 성분 고르기",
    });
  });

  it("신규 성분이 생기면 신규 성분만 고르는 버튼을 둔다(S53i)", () => {
    expect(
      summarizeAnalysis([ingredient(1, { inFilter: true }), ingredient(2, { isNew: true })], {
        filterCount: 1,
        badProductCount: 2,
        hasSkinType: false,
      }),
    ).toMatchObject({
      pickLabel: "검색에서 제외할 신규 성분 고르기",
      outsideResultCount: 0,
    });
  });

  it("신규 성분이 없으면 버튼을 두지 않고, 결과 밖에 있는 제외 성분 수를 센다(S53l)", () => {
    expect(
      summarizeAnalysis([ingredient(1, { inFilter: true }), ingredient(2)], {
        filterCount: 2,
        badProductCount: 2,
        hasSkinType: false,
      }),
    ).toMatchObject({
      pickLabel: undefined,
      outsideResultCount: 1,
    });
  });

  it("피부 타입이 없으면 안 맞은 제품 하나만으로 고르기를 권하지 않는다", () => {
    expect(
      summarizeAnalysis([ingredient(1), ingredient(2)], { filterCount: 0, badProductCount: 1, hasSkinType: false }),
    ).toMatchObject({ pickLabel: undefined });
  });

  it("피부 타입이 있으면 안 맞은 제품 하나부터 고르기를 권한다", () => {
    expect(
      summarizeAnalysis([ingredient(1)], { filterCount: 0, badProductCount: 1, hasSkinType: true }).pickLabel,
    ).toBe("검색에서 제외할 성분 고르기");
    expect(
      summarizeAnalysis([ingredient(1, { isNew: true })], { filterCount: 1, badProductCount: 1, hasSkinType: true })
        .pickLabel,
    ).toBe("검색에서 제외할 신규 성분 고르기");
  });

  it("피부 타입이 있어도 나쁜 평가나 고를 성분이 없으면 버튼을 두지 않는다", () => {
    expect(
      summarizeAnalysis([ingredient(1)], { filterCount: 0, badProductCount: 0, hasSkinType: true }).pickLabel,
    ).toBeUndefined();
    expect(summarizeAnalysis([], { filterCount: 0, badProductCount: 1, hasSkinType: true }).pickLabel).toBeUndefined();
    expect(
      summarizeAnalysis([ingredient(1, { inFilter: true })], { filterCount: 1, badProductCount: 1, hasSkinType: true })
        .pickLabel,
    ).toBeUndefined();
  });
});

describe("검색에서 제외할 성분 고르기", () => {
  it("이미 제외 중인 성분이 없으면 모두 골라 둔다(S53c)", () => {
    expect(initialExcludeSelection([ingredient(1), ingredient(2)])).toEqual([1, 2]);
  });

  it("이미 제외 중인 성분이 있으면 그것과 새 성분만 골라 둔다(S53j)", () => {
    const items = [ingredient(1, { inFilter: true }), ingredient(2, { isNew: true }), ingredient(3)];
    expect(initialExcludeSelection(items)).toEqual([1, 2]);
    expect(ingredientsToExclude(items, [1, 2])).toEqual([2]);
  });

  it("행 오른쪽 글은 이미 제외 중, 신규, 제품 수 순으로 고른다", () => {
    expect(excludeRowNote(ingredient(1, { inFilter: true }), true)).toBe("이미 제외 중이에요");
    expect(excludeRowNote(ingredient(1, { isNew: true }), true)).toBe("신규 · 제품 1개에 있음");
    expect(excludeRowNote(ingredient(1), true)).toBe("제품 1개에 있음");
  });

  it("아직 아무것도 제외하지 않았으면 처음 결과를 새 성분으로 표시하지 않는다", () => {
    expect(excludeRowNote(ingredient(1, { isNew: true }), false)).toBe("제품 1개에 있음");
  });
});

describe("평가 초안", () => {
  const rated = item(1, { rating: { preference: "BAD", moistureLevel: 1.5, oilLevel: 2 } });

  it("평가를 지우면 사용 상태만 남긴다", () => {
    expect(clearedDraft(rated)).toEqual({
      usageStatus: "IN_USE",
      preference: null,
      moistureLevel: null,
      oilLevel: null,
    });
  });

  it("옮기면 평가는 그대로 두고 사용 상태만 바꾼다", () => {
    expect(movedDraft(rated, "USED")).toEqual({
      usageStatus: "USED",
      preference: "BAD",
      moistureLevel: 1.5,
      oilLevel: 2,
    });
  });
});

describe("ratingLevelText", () => {
  it("정수는 단계 이름, 반 칸은 두 단계 사이로 적는다(S52e-1)", () => {
    expect([0, 1, 2, 3].map(ratingLevelText)).toEqual(["없음", "낮음", "보통", "높음"]);
    expect([0.5, 1.5, 2.5].map(ratingLevelText)).toEqual(["없음~낮음", "낮음~보통", "보통~높음"]);
  });

  it("눈금 이름은 정수 눈금에만 둔다", () => {
    expect([0, 1, 2, 3].map(ratingLevelMark)).toEqual(["없음", "낮음", "보통", "높음"]);
  });
});
