import { describe, expect, it } from "vitest";

import { MAX_LEVEL } from "./filter";
import { dropletFills, LEVEL_LABELS, levelLabel, productIngredientDescription } from "./product-display";

describe("levelLabel", () => {
  it("0~3 을 이름으로 바꾼다", () => {
    expect([0, 1, 2, 3].map(levelLabel)).toEqual(["없음", "낮음", "보통", "높음"]);
  });

  it("0.5 단위 값은 가까운 단계로 올린다", () => {
    expect([0.5, 1.5, 2.5].map(levelLabel)).toEqual(["낮음", "보통", "높음"]);
  });

  it("범위를 벗어나면 없음으로 본다", () => {
    expect(levelLabel(9)).toBe("없음");
  });
});

describe("dropletFills", () => {
  it("단계만큼 채운다", () => {
    expect(dropletFills(0)).toEqual([false, false, false]);
    expect(dropletFills(2)).toEqual([true, true, false]);
    expect(dropletFills(3)).toEqual([true, true, true]);
  });
});

describe("productIngredientDescription", () => {
  it("제품별 전성분 수와 대표 성분 분류를 짧은 검색 설명으로 만든다", () => {
    expect(
      productIngredientDescription({
        brandName: "이니스프리",
        productName: "그린티 히알루론산 수분 세럼",
        ingredientCount: 42,
        effectNames: ["보습", "진정", "각질 케어"],
      }),
    ).toBe("이니스프리 그린티 히알루론산 수분 세럼의 전성분 42개와 보습·진정 관련 성분을 확인해 보세요.");
  });

  it("성분 분류가 없으면 전성분 수만 설명한다", () => {
    expect(
      productIngredientDescription({
        brandName: "셀퓨전씨",
        productName: "더마 릴리프 썬스크린",
        ingredientCount: 24,
        effectNames: [],
      }),
    ).toBe("셀퓨전씨 더마 릴리프 썬스크린의 전성분 24개를 확인해 보세요.");
  });
});

describe("LEVEL_LABELS", () => {
  it("서버가 받는 유수분 단계마다 이름이 있다", () => {
    expect(LEVEL_LABELS).toHaveLength(MAX_LEVEL + 1);
  });
});
