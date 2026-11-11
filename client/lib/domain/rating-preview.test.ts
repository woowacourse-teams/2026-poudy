import type {
  IngredientAnalysisItemResponse,
  IngredientAnalysisPreviewResponse,
  IngredientAnalysisReason,
  IngredientAnalysisResponse,
} from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import {
  displayChipsOf,
  enteringChipCount,
  hasLeavingChip,
  previewAnnouncement,
  previewChipsOf,
  previewResultOf,
  settleChips,
  transitionChips,
} from "./rating-preview";

const REASON_NAMES: Readonly<Record<IngredientAnalysisReason, string>> = {
  QUICK_EXCLUDE: "빠른 제외 성분",
  DRY_SKIN: "건성 피부 주의 후보",
  OILY_SKIN: "지성 피부 주의 후보",
  SENSITIVE_SKIN: "민감성 피부 주의 후보",
};

const ingredient = (
  id: number,
  productCount: number,
  reasons: readonly IngredientAnalysisReason[] = ["QUICK_EXCLUDE"],
): IngredientAnalysisItemResponse => ({
  id,
  koreanName: `성분 ${id}`,
  formulationRoles: [],
  groupCodes: [],
  reasons: reasons.map((code) => ({ code, name: REASON_NAMES[code] })),
  products: Array.from({ length: productCount }, (_, index) => ({
    id: index + 1,
    name: `제품 ${index + 1}`,
    imageUrl: "",
  })),
  inFilter: false,
  isNew: false,
});

const analysis = (
  badProductCount: number,
  items: readonly IngredientAnalysisItemResponse[],
): IngredientAnalysisResponse => ({ badProductCount, items: [...items] });

const preview = (overrides: Partial<IngredientAnalysisPreviewResponse> = {}): IngredientAnalysisPreviewResponse => ({
  withoutRating: analysis(1, [ingredient(1, 1), ingredient(2, 1)]),
  ratedGood: analysis(1, [ingredient(2, 1)]),
  ratedBad: analysis(2, [ingredient(1, 2), ingredient(2, 1), ingredient(3, 1)]),
  ratedBadAcrossSkinTypes: null,
  productCautionIngredients: [],
  ...overrides,
});

const phasesOf = (chips: ReturnType<typeof transitionChips>) => chips.map((chip) => `${chip.key}:${chip.phase}`);

const chipsOf = (analysisResult: IngredientAnalysisResponse) => previewChipsOf(analysisResult);

describe("previewResultOf", () => {
  it("안 맞았어요 결과가 비었고 넓혀 본 결과가 있으면 예상 후보로 보여 준다", () => {
    const widened = analysis(1, [ingredient(7, 1, ["DRY_SKIN"])]);
    const result = previewResultOf(preview({ ratedBad: analysis(1, []), ratedBadAcrossSkinTypes: widened }), "BAD");

    expect(result).toEqual({ analysis: widened, estimated: true });
  });

  it("피부 타입이 없으면 빠른 제외 후보가 있어도 피부별 후보를 함께 보여 준다", () => {
    const widened = analysis(1, [ingredient(1, 1), ingredient(7, 1, ["DRY_SKIN"])]);
    const result = previewResultOf(
      preview({ ratedBad: analysis(1, [ingredient(1, 1)]), ratedBadAcrossSkinTypes: widened }),
      "BAD",
    );
    expect(result).toEqual({ analysis: widened, estimated: true });
  });

  it("넓혀 본 결과가 없으면 예상 후보가 아니다", () => {
    expect(previewResultOf(preview(), null).estimated).toBe(false);
    expect(previewResultOf(preview(), "BAD").estimated).toBe(false);
  });
});

describe("transitionChips", () => {
  it("안 맞았어요로 바꾸면 새 성분은 나타나고, 개수가 바뀐 성분은 커지고, 나머지는 그대로다", () => {
    const current = displayChipsOf(chipsOf(preview().withoutRating));
    const next = transitionChips(current, chipsOf(preview().ratedBad));

    expect(phasesOf(next)).toEqual(["1:bump", "2:stay", "3:enter"]);
    expect(next.filter((chip) => chip.phase === "enter")).toHaveLength(1);
  });

  it("잘 맞았어요로 빠지는 성분은 있던 자리에 남겨 두고 빠지는 중으로 둔다", () => {
    const current = displayChipsOf(chipsOf(preview().withoutRating));
    const next = transitionChips(current, chipsOf(preview().ratedGood));

    expect(phasesOf(next)).toEqual(["1:leave", "2:stay"]);
    expect(phasesOf(settleChips(next))).toEqual(["2:stay"]);
  });

  it("빠지는 중에 다시 바꾸면 빠지던 칩은 없는 것으로 보고 새로 나타나게 한다", () => {
    const base = displayChipsOf(chipsOf(preview().withoutRating));
    const leaving = transitionChips(base, chipsOf(preview().ratedGood));
    const back = transitionChips(leaving, chipsOf(preview().withoutRating));

    expect(phasesOf(back)).toEqual(["1:enter", "2:stay"]);
  });
});

describe("previewChipsOf", () => {
  it("여러 근거에 든 성분도 칩 하나로 두고, 나타나는 칩은 차례로 순번을 받는다", () => {
    const chips = previewChipsOf(
      analysis(1, [ingredient(1, 1), ingredient(3, 1), ingredient(2, 1, ["DRY_SKIN", "SENSITIVE_SKIN"])]),
    );
    expect(chips.map((chip) => chip.id)).toEqual([1, 3, 2]);
    const next = transitionChips([], chips);
    expect(next.map((chip) => chip.order)).toEqual([0, 1, 2]);
    expect(enteringChipCount(next)).toBe(3);
  });

  it("다음 결과에 없는 성분은 빠지는 중으로 남았다가 정리된다", () => {
    const current = displayChipsOf(previewChipsOf(analysis(1, [ingredient(1, 1), ingredient(5, 1, ["DRY_SKIN"])])));
    const next = transitionChips(current, previewChipsOf(analysis(1, [ingredient(1, 1)])));
    expect(hasLeavingChip(next)).toBe(true);
    expect(settleChips(next).map((chip) => chip.id)).toEqual([1]);
  });
});

describe("previewAnnouncement", () => {
  it("주의 성분이 더해지지 않으면 기존 결과가 유지된다고 낭독한다", () => {
    const current = analysis(1, [ingredient(1, 1)]);
    const data = preview({
      withoutRating: current,
      ratedBad: { ...current, badProductCount: 2 },
      productCautionIngredients: [],
    });
    expect(previewAnnouncement("BAD", previewResultOf(data, "BAD"), { preview: data })).toBe(
      "변경된 게 없어요. 안 맞을 수 있는 성분 1개.",
    );
  });

  it("빠질 후보가 없는 잘 맞았어요는 성분이 후보에서 이동했다고 낭독하지 않는다", () => {
    const data = preview({
      withoutRating: analysis(0, []),
      ratedGood: analysis(0, []),
      productCautionIngredients: [
        { id: 1, koreanName: "성분", reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }] },
      ],
    });
    const announcement = previewAnnouncement("GOOD", previewResultOf(data, "GOOD"), { preview: data });
    expect(announcement).toBe("잘 맞은 제품의 성분. 나에게 괜찮았던 성분 1개.");
  });
});
