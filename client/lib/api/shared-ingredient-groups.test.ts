import { describe, expect, it } from "vitest";

import { ProductSimilarityWithGroups, UserProductWithGroups } from "./shared-ingredient-groups";

import { productSimilarities } from "@/mocks/fixtures";

const groups = [
  { code: "HYALURONIC_ACID", name: "히알루론산" },
  { code: "PANTHENOL", name: "판테놀" },
];
const [candidate] = productSimilarities.get(1)!;

describe("겹치는 성분군 교집합 스키마", () => {
  it("생성 스키마가 필드를 몰라도 파싱 결과에 겹치는 성분군을 남긴다", () => {
    const parsed = ProductSimilarityWithGroups.parse({
      partId: 1,
      calculated: true,
      items: [{ ...candidate!, sharedIngredientGroups: groups }],
    });
    expect(parsed.items[0]?.sharedIngredientGroups).toEqual(groups);
    expect(parsed.items[0]?.name).toBe(candidate!.name);
  });

  it("회원별 제품 정보의 비슷한 제품에도 겹치는 성분군을 남긴다", () => {
    const parsed = UserProductWithGroups.parse({
      wishlisted: false,
      shelved: false,
      myFilterEmpty: true,
      unsuitableIngredients: [],
      similarProducts: [{ id: 3, containsMyFilterIngredient: true, sharedIngredientGroups: groups }],
    });
    expect(parsed.similarProducts).toEqual([
      { id: 3, containsMyFilterIngredient: true, sharedIngredientGroups: groups },
    ]);
  });

  it("겹치는 성분군의 모양이 계약과 다르면 거른다", () => {
    const result = ProductSimilarityWithGroups.safeParse({
      partId: 1,
      calculated: true,
      items: [{ ...candidate!, sharedIngredientGroups: [{ id: 12, name: "히알루론산" }] }],
    });
    expect(result.success).toBe(false);
  });
});
