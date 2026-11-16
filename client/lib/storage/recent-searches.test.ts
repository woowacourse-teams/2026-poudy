/**
 * localStorage 를 쓰므로 브라우저 환경이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearchesSnapshot,
  readRecentSearches,
  RECENT_SEARCH_LIMIT,
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

const KEY = "poudy.recent-searches.v1";

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

  it("최근 5건까지만 남기고 오래된 것부터 밀어낸다", () => {
    ["1", "2", "3", "4", "5", "6", "7"].forEach((word) => addRecentSearch(keyword(word)));

    expect(RECENT_SEARCH_LIMIT).toBe(5);
    expect(readRecentSearches()).toEqual(["7", "6", "5", "4", "3"].map(keyword));
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "{}").value).toHaveLength(5);
  });
});

describe("예전에 5건 넘게 남은 기록", () => {
  const seedEight = () => {
    const value = ["1", "2", "3", "4", "5", "6", "7", "8"].map(keyword);
    window.localStorage.setItem(KEY, JSON.stringify({ version: 2, value }));
    refreshRecentSearches();
  };

  it("앞의 5건만 읽는다", () => {
    seedEight();

    expect(getRecentSearchesSnapshot()).toEqual(["1", "2", "3", "4", "5"].map(keyword));
    expect(readRecentSearches()).toHaveLength(5);
  });

  it("하나를 지워도 가려 둔 기록이 다시 올라오지 않는다", () => {
    seedEight();

    removeRecentSearch(recentSearchId(keyword("1")));

    expect(readRecentSearches()).toEqual(["2", "3", "4", "5"].map(keyword));
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
