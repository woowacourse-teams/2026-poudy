import { describe, expect, it } from "vitest";

import { ingredientReferenceHref, ingredientReferences } from "./ingredient-references";

describe("ingredientReferences", () => {
  it("자료마다 설명의 어느 부분에 반영했는지 붙인다", () => {
    expect(ingredientReferences(["CosIng"], ["Scott et al., 2022"])).toEqual([
      { source: "CosIng", usage: "성분 정보" },
      { source: "Scott et al., 2022", usage: "피부 작용 분류" },
    ]);
  });

  it("두 곳에 모두 쓴 자료는 한 줄로 합친다", () => {
    expect(ingredientReferences(["COSMILE", "CosIng"], ["COSMILE"])).toEqual([
      { source: "COSMILE", usage: "성분 정보·피부 작용 분류" },
      { source: "CosIng", usage: "성분 정보" },
    ]);
  });

  it("자료가 없으면 빈 목록을 돌려준다", () => {
    expect(ingredientReferences([], [])).toEqual([]);
  });

  it("내부 분류 메모를 참고문헌 건수에 포함하지 않는다", () => {
    expect(
      ingredientReferences([], ["피부 컨디셔닝 기능이 설명·근거에 명시됨", "식물·해조류 등 유래 추출·수 원료 정보"]),
    ).toEqual([]);
  });

  it("출처 이름으로 공식 자료를 검색하며 내부 번호를 레코드 번호로 사용하지 않는다", () => {
    const href = ingredientReferenceHref("대한화장품협회 성분사전 「비타민나무수」(성분코드 6313)");
    const url = new URL(href!);
    expect(url.hostname).toBe("kcia.or.kr");
    expect(url.searchParams.get("sword")).toBe('"비타민나무수"');
    expect(url.searchParams.has("no")).toBe(false);
    expect(ingredientReferenceHref("일반 연구 자료")).toBeUndefined();
  });
});
