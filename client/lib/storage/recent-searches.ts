import { createLocalStore } from "./local-store";

/** 디자인(S02)의 최근 검색 항목은 제품명과 브랜드를 함께 보여 준다. */
export type RecentSearch = {
  readonly productId: number;
  readonly name: string;
  readonly brandName: string;
};

const MAX = 10;

const isRecentSearches = (value: unknown): value is RecentSearch[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as RecentSearch).productId === "number" &&
      typeof (item as RecentSearch).name === "string" &&
      typeof (item as RecentSearch).brandName === "string",
  );

const store = createLocalStore<RecentSearch[]>("poudy.recent-searches.v1", {
  version: 1,
  fallback: [],
  isValid: isRecentSearches,
});

export const readRecentSearches = (): readonly RecentSearch[] => store.read();

/** 같은 제품을 다시 고르면 위로 올린다. 오래된 것부터 밀려난다. */
export const addRecentSearch = (search: RecentSearch): readonly RecentSearch[] => {
  const next = [search, ...store.read().filter((item) => item.productId !== search.productId)].slice(0, MAX);
  store.write(next);
  return next;
};

export const removeRecentSearch = (productId: number): readonly RecentSearch[] => {
  const next = store.read().filter((item) => item.productId !== productId);
  store.write(next);
  return next;
};

export const clearRecentSearches = (): void => store.clear();
