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

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeRecentSearches = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

let snapshot: readonly RecentSearch[] = store.read();

export const getRecentSearchesSnapshot = (): readonly RecentSearch[] => snapshot;

/** 서버에는 최근 검색이 없다. 첫 HTML 이 어긋나지 않게 빈 목록을 쓴다. */
const SERVER_SNAPSHOT: readonly RecentSearch[] = [];

export const getRecentSearchesServerSnapshot = (): readonly RecentSearch[] => SERVER_SNAPSHOT;

const commit = (next: readonly RecentSearch[]): readonly RecentSearch[] => {
  snapshot = next;
  store.write([...next]);
  notify();
  return next;
};

export const readRecentSearches = (): readonly RecentSearch[] => store.read();

/** 같은 제품을 다시 고르면 위로 올린다. 오래된 것부터 밀려난다. */
export const addRecentSearch = (search: RecentSearch): readonly RecentSearch[] =>
  commit([search, ...snapshot.filter((item) => item.productId !== search.productId)].slice(0, MAX));

export const removeRecentSearch = (productId: number): readonly RecentSearch[] =>
  commit(snapshot.filter((item) => item.productId !== productId));

export const clearRecentSearches = (): void => {
  snapshot = [];
  store.clear();
  notify();
};

/** localStorage 를 직접 지운 테스트에서 메모리 스냅샷을 다시 맞춘다. */
export const refreshRecentSearches = (): void => {
  snapshot = store.read();
  notify();
};
