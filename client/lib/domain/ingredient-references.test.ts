import { describe, expect, it } from "vitest";

import { ingredientReferences } from "./ingredient-references";

describe("ingredientReferences", () => {
  it("자료마다 설명의 어느 부분에 반영했는지 붙인다", () => {
    expect(ingredientReferences(["CosIng"], ["Scott et al., 2022"])).toEqual([
      { source: "CosIng", usage: "배합 목적" },
      { source: "Scott et al., 2022", usage: "기대 효과" },
    ]);
  });

  it("두 곳에 모두 쓴 자료는 한 줄로 합친다", () => {
    expect(ingredientReferences(["COSMILE", "CosIng"], ["COSMILE"])).toEqual([
      { source: "COSMILE", usage: "배합 목적·기대 효과" },
      { source: "CosIng", usage: "배합 목적" },
    ]);
  });

  it("자료가 없으면 빈 목록을 돌려준다", () => {
    expect(ingredientReferences([], [])).toEqual([]);
  });
});
