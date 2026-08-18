import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIZE,
  DEFAULT_SORT,
  EMPTY_FILTER,
  type Filter,
  hasCondition,
  parseFilter,
  serializeFilter,
  withCondition,
} from "./filter";

const parse = (query: string) => parseFilter(new URLSearchParams(query));

describe("parseFilter", () => {
  it("빈 쿼리는 기본값이 된다", () => {
    expect(parse("")).toEqual(EMPTY_FILTER);
  });

  it("같은 키가 여러 번 오면 모두 읽는다", () => {
    expect(parse("brandIds=1&brandIds=2").brandIds).toEqual([1, 2]);
  });

  it("쉼표로 이어 붙인 값도 읽는다", () => {
    expect(parse("brandIds=1,2,3").brandIds).toEqual([1, 2, 3]);
  });

  it("중복된 값은 한 번만 남긴다", () => {
    expect(parse("brandIds=1&brandIds=1&brandIds=2").brandIds).toEqual([1, 2]);
  });

  it("숫자가 아니거나 0 이하인 ID 는 버린다", () => {
    expect(parse("brandIds=abc&brandIds=0&brandIds=-1&brandIds=2").brandIds).toEqual([2]);
  });

  it("수분감은 0~3 범위만 남기고 정렬한다", () => {
    expect(parse("moistureLevel=3&moistureLevel=0&moistureLevel=9").moistureLevel).toEqual([0, 3]);
  });

  it("알 수 없는 정렬은 기본값으로 되돌린다", () => {
    expect(parse("sort=UNKNOWN").sort).toBe(DEFAULT_SORT);
    expect(parse("sort=PRICE_DESC").sort).toBe("PRICE_DESC");
  });

  it("알 수 없는 빠른 필터 코드는 버린다", () => {
    expect(parse("excludeCodes=SULFATES,NOPE").excludeCodes).toEqual(["SULFATES"]);
  });

  it("공백뿐인 검색어는 없는 것으로 본다", () => {
    expect(parse("keyword=%20%20").keyword).toBeUndefined();
    expect(parse("keyword=%20독도%20").keyword).toBe("독도");
  });

  it("음수 페이지는 기본값으로 되돌린다", () => {
    expect(parse("page=-2").page).toBe(0);
    expect(parse("size=abc").size).toBe(DEFAULT_SIZE);
  });
});

describe("serializeFilter", () => {
  it("기본값은 URL 에 남기지 않는다", () => {
    expect(serializeFilter(EMPTY_FILTER).toString()).toBe("");
  });

  it("정렬과 페이지가 기본값이 아니면 남긴다", () => {
    const filter: Filter = { ...EMPTY_FILTER, sort: "PRICE_ASC", page: 2 };
    expect(serializeFilter(filter).toString()).toBe("sort=PRICE_ASC&page=2");
  });

  it("배열은 같은 키를 반복해 쓴다", () => {
    const filter: Filter = { ...EMPTY_FILTER, brandIds: [1, 2] };
    expect(serializeFilter(filter).toString()).toBe("brandIds=1&brandIds=2");
  });
});

describe("직렬화한 뒤 다시 파싱하면 원래 조건이 된다", () => {
  const cases: readonly [string, Filter][] = [
    ["빈 조건", EMPTY_FILTER],
    ["검색어", { ...EMPTY_FILTER, keyword: "독도 토너" }],
    ["성분 포함·제외", { ...EMPTY_FILTER, includeIngredientIds: [6], excludeIngredientIds: [101] }],
    ["빠른 필터", { ...EMPTY_FILTER, excludeCodes: ["SULFATES", "FRAGRANCE_ALLERGENS"] }],
    ["수분·유분", { ...EMPTY_FILTER, moistureLevel: [1, 2], oilLevel: [0] }],
    [
      "모든 조건",
      {
        keyword: "토너",
        categoryIds: [11],
        brandIds: [1, 2],
        moistureLevel: [2, 3],
        oilLevel: [0, 1],
        includeIngredientIds: [6],
        excludeIngredientIds: [101, 102],
        excludeCodes: ["DRYING_ALCOHOLS"],
        sort: "PRICE_DESC",
        page: 3,
        size: 40,
      },
    ],
  ];

  it.each(cases)("%s", (_, filter) => {
    expect(parseFilter(serializeFilter(filter))).toEqual(filter);
  });
});

describe("hasCondition", () => {
  it("조건이 없으면 false 다", () => {
    expect(hasCondition(EMPTY_FILTER)).toBe(false);
  });

  it("정렬과 페이지는 조건으로 보지 않는다", () => {
    expect(hasCondition({ ...EMPTY_FILTER, sort: "PRICE_ASC", page: 2 })).toBe(false);
  });

  it("조건이 하나라도 있으면 true 다", () => {
    expect(hasCondition({ ...EMPTY_FILTER, excludeCodes: ["SULFATES"] })).toBe(true);
  });
});

describe("withCondition", () => {
  it("조건을 바꾸면 페이지를 처음으로 되돌린다", () => {
    const filter: Filter = { ...EMPTY_FILTER, page: 5 };
    expect(withCondition(filter, { brandIds: [1] })).toEqual({
      ...EMPTY_FILTER,
      brandIds: [1],
      page: 0,
    });
  });
});
