/**
 * localStorage 를 쓰므로 브라우저 환경이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  addRecentSearch,
  clearRecentSearches,
  readRecentSearches,
  recentSearchId,
  refreshRecentSearches,
  removeRecentSearch,
} from "./recent-searches";

beforeEach(() => {
  window.localStorage.clear();
  refreshRecentSearches();
});

const product = (productId: number, name = `제품 ${productId}`) =>
  ({ kind: "product", productId, name, brandName: "브랜드" }) as const;

const keyword = (word: string) => ({ kind: "keyword", keyword: word }) as const;

describe("addRecentSearch", () => {
  it("고른 제품과 검색어를 한 자리에 함께 담는다", () => {
    addRecentSearch(product(1));
    addRecentSearch(keyword("토너"));

    expect(readRecentSearches()).toEqual([keyword("토너"), product(1)]);
  });

  it("같은 제품을 다시 고르면 위로 올린다", () => {
    addRecentSearch(product(1));
    addRecentSearch(product(2));
    addRecentSearch(product(1));

    expect(readRecentSearches()).toEqual([product(1), product(2)]);
  });

  it("같은 검색어를 다시 보면 위로 올린다", () => {
    addRecentSearch(keyword("토너"));
    addRecentSearch(keyword("세럼"));
    addRecentSearch(keyword("토너"));

    expect(readRecentSearches()).toEqual([keyword("토너"), keyword("세럼")]);
  });

  it("숫자가 같아도 갈래가 다르면 서로 밀어내지 않는다", () => {
    addRecentSearch(product(1));
    addRecentSearch(keyword("1"));

    expect(readRecentSearches()).toHaveLength(2);
  });
});

describe("removeRecentSearch", () => {
  it("고른 자리만 뺀다", () => {
    addRecentSearch(product(1));
    addRecentSearch(keyword("토너"));

    removeRecentSearch(recentSearchId(keyword("토너")));

    expect(readRecentSearches()).toEqual([product(1)]);
  });
});

describe("clearRecentSearches", () => {
  it("두 갈래를 모두 비운다", () => {
    addRecentSearch(product(1));
    addRecentSearch(keyword("토너"));

    clearRecentSearches();

    expect(readRecentSearches()).toEqual([]);
  });
});
