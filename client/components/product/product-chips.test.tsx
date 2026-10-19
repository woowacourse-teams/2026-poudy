import { describe, expect, it } from "vitest";

import { chipsOf, filterValueCount } from "./product-chips";

import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";

const categories = [
  {
    id: 1,
    name: "스킨케어",
    productCount: 10,
    children: [
      { id: 11, name: "스킨/토너", productCount: 5 },
      { id: 12, name: "크림", productCount: 5 },
    ],
  },
];
const brands = [
  { id: 1, name: "닥터지", englishName: null, imageUrl: null },
  { id: 2, name: "라운드랩", englishName: null, imageUrl: null },
  { id: 3, name: "토리든", englishName: null, imageUrl: null },
];

const valueOf = (id: string, changed: Partial<Filter>) =>
  chipsOf({ ...EMPTY_FILTER, ...changed }, { categories, brands }).find((chip) => chip.id === id)?.value;

describe("필터 칩 값(명세 APP · 필터 칩 · 선택)", () => {
  it("칩 순서는 성분 → 카테고리 → 브랜드 → 유수분 → 피부 타입으로 고정한다", () => {
    expect(chipsOf(EMPTY_FILTER, { categories, brands }).map((chip) => chip.label)).toEqual([
      "성분",
      "카테고리",
      "브랜드",
      "유수분",
      "피부 타입",
    ]);
  });

  it("조건이 없으면 값을 비워 칩 이름을 그대로 보인다", () => {
    expect(chipsOf(EMPTY_FILTER, { categories, brands }).every((chip) => chip.value === undefined)).toBe(true);
  });

  it("성분은 담은 성분과 성분군, 자주 피하는 성분을 하나씩 센다", () => {
    expect(
      valueOf("ingredient", {
        includeIngredientIds: [1, 2],
        excludeIngredientIds: [3],
        excludeCodes: ["FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS"],
      }),
    ).toBe("성분 5");
  });

  it("카테고리는 대분류 전체면 대분류 이름, 소분류면 소분류 이름이다", () => {
    expect(valueOf("category", { categoryIds: [1] })).toBe("스킨케어");
    expect(valueOf("category", { categoryIds: [11, 12] })).toBe("스킨케어");
    expect(valueOf("category", { categoryIds: [12] })).toBe("크림");
  });

  it("브랜드는 하나면 이름, 여럿이면 '첫 이름 외 N개'다", () => {
    expect(valueOf("brand", { brandIds: [1] })).toBe("닥터지");
    expect(valueOf("brand", { brandIds: [1, 2, 3] })).toBe("닥터지 외 2개");
  });

  it("후보를 아직 받지 못했으면 개수로 적는다", () => {
    expect(valueOf("brand", { brandIds: [99] })).toBe("브랜드 1");
  });

  it("유수분은 범위로 적고 둘 다 걸리면 '외 1개'를 붙인다", () => {
    expect(valueOf("level", { moistureLevel: [2, 3] })).toBe("수분감 보통~높음");
    expect(valueOf("level", { moistureLevel: [2, 3], oilLevel: [0, 1] })).toBe("수분감 보통~높음 외 1개");
    expect(valueOf("level", { oilLevel: [1] })).toBe("유분감 낮음");
  });

  it("피부 타입은 이름을 적고 민감성과 함께면 '외 1개'를 붙인다", () => {
    expect(valueOf("skinType", { skinTypes: ["DRY"] })).toBe("건성");
    expect(valueOf("skinType", { skinTypes: ["DRY"], sensitiveSkin: true })).toBe("건성 외 1개");
    expect(valueOf("skinType", { skinTypes: ["DRY", "OILY"], sensitiveSkin: true })).toBe("건성 외 2개");
    expect(valueOf("skinType", { sensitiveSkin: true })).toBe("민감성");
  });
});

describe("filter_applied 의 성분 개수", () => {
  it("제외 성분군은 성분 제외처럼 세고 포함 조건은 세지 않는다(개편 전과 같은 뜻)", () => {
    const filter = {
      ...EMPTY_FILTER,
      excludeGroupCodes: ["CERAMIDES"],
      excludeIngredientIds: [1],
      includeIngredientIds: [2],
    };

    expect(filterValueCount("ingredient", filter, [])).toBe(2);
  });
});
