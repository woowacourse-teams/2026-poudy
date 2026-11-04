import { ProductDetailResponse, type ConcernGroupResponse } from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";

import { concernIngredientCount, productEffectNames } from "./product-effects";

import { productDetails } from "@/mocks/fixtures";

const part = productDetails[0].selectedPart!;
const concern: ConcernGroupResponse = {
  code: "DRYNESS",
  name: "건조·당김",
  effects: [
    { code: "HYDRATION_RELATED", name: "서버 효능명" },
    { code: "BARRIER_SUPPORT_RELATED", name: "서버 장벽명" },
  ],
  items: [
    {
      type: "INGREDIENT_GROUP",
      code: "GROUP",
      name: "서버 성분군명",
      ingredients: [
        { id: 2, koreanName: "부틸렌글라이콜" },
        { id: 3, koreanName: "글리세린" },
      ],
    },
    { type: "INGREDIENT", id: 6, koreanName: "판테놀" },
  ],
};

describe("제품 상세 계약 전환", () => {
  it("성분군 내부까지 포함해 고민에 합쳐진 성분 수를 센다", () => {
    expect(concernIngredientCount(concern)).toBe(3);
    expect(
      concernIngredientCount({
        ...concern,
        items: [...concern.items, { type: "INGREDIENT", id: 6, koreanName: "판테놀" }],
      }),
    ).toBe(3);
  });

  it("고민별 성분은 필수 배열이며 누락된 응답은 거절한다", () => {
    expect(
      ProductDetailResponse.safeParse({
        ...productDetails[0],
        selectedPart: { ...part, concernGroups: undefined },
      }).success,
    ).toBe(false);
  });

  it("성분은 고민 직하의 items에 있고 효능에는 코드와 이름만 있는 계약을 검증한다", () => {
    const parsed = ProductDetailResponse.parse({
      ...productDetails[0],
      selectedPart: { ...part, concernGroups: [concern] },
    });
    expect(parsed.selectedPart?.concernGroups?.[0]).toEqual(concern);
    expect(productEffectNames(parsed.selectedPart)).toEqual(["서버 효능명", "서버 장벽명"]);
  });

  it("서버의 효능명을 사용하고 서로 다른 고민의 같은 효능은 한 번만 표시한다", () => {
    expect(
      productEffectNames({
        ...part,
        concernGroups: [concern, { ...concern, code: "UNEVEN_TEXTURE", name: "거친 피부결" }],
      }),
    ).toEqual(["서버 효능명", "서버 장벽명"]);
  });

  it("빈 고민 결과와 구성품 없음은 효능명도 비어 있다", () => {
    expect(productEffectNames({ ...part, concernGroups: [] })).toEqual([]);
    expect(productEffectNames(null)).toEqual([]);
  });

  it("항목의 type과 필수 필드 및 고민 items의 존재를 검증한다", () => {
    for (const item of [
      { type: "UNKNOWN", id: 1, koreanName: "성분" },
      { type: "INGREDIENT", id: 1 },
      { type: "INGREDIENT_GROUP", code: "G", name: "군" },
      { type: "INGREDIENT_GROUP", code: "G", name: "군", ingredients: [{ id: 1 }] },
    ]) {
      expect(
        ProductDetailResponse.safeParse({
          ...productDetails[0],
          selectedPart: { ...part, concernGroups: [{ ...concern, items: [item] }] },
        }).success,
      ).toBe(false);
    }
    expect(
      ProductDetailResponse.safeParse({
        ...productDetails[0],
        selectedPart: { ...part, concernGroups: [{ ...concern, items: undefined }] },
      }).success,
    ).toBe(false);
  });
});
