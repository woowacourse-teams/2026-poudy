import { createLocalStore } from "./local-store";

/**
 * 최근 검색 항목. 두 갈래를 함께 담는다.
 *
 * 자동완성에서 제품을 고르면 그 제품이(`product`), 검색어로 목록을 보면 그 말이
 * (`keyword`) 남는다. 둘은 다시 갈 곳이 달라 한 자리에 섞어 두되 무엇인지 구분한다.
 */
export type RecentSearch =
  | {
      readonly kind: "product";
      readonly productId: number;
      readonly name: string;
      readonly brandName: string;
    }
  | {
      readonly kind: "keyword";
      readonly keyword: string;
    };

const MAX = 10;

/** 같은 것을 다시 고르면 위로 올리기 위해 갈래마다 다른 자리로 견준다. */
const identityOf = (item: RecentSearch): string =>
  item.kind === "product" ? `product:${item.productId}` : `keyword:${item.keyword}`;

const isRecentSearch = (value: unknown): value is RecentSearch => {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Partial<RecentSearch> & Record<string, unknown>;
  if (item.kind === "product") {
    return typeof item.productId === "number" && typeof item.name === "string" && typeof item.brandName === "string";
  }

  return item.kind === "keyword" && typeof item.keyword === "string";
};

const isRecentSearches = (value: unknown): value is RecentSearch[] =>
  Array.isArray(value) && value.every(isRecentSearch);

/* 담는 모양이 바뀌어 버전을 올린다. 예전에 쌓인 것은 다시 만들 수 있는 값이라 버린다. */
const store = createLocalStore<RecentSearch[]>("poudy.recent-searches.v1", {
  version: 2,
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

/** 같은 것을 다시 고르면 위로 올린다. 오래된 것부터 밀려난다. */
export const addRecentSearch = (search: RecentSearch): readonly RecentSearch[] => {
  const id = identityOf(search);
  return commit([search, ...snapshot.filter((item) => identityOf(item) !== id)].slice(0, MAX));
};

export const removeRecentSearch = (id: string): readonly RecentSearch[] =>
  commit(snapshot.filter((item) => identityOf(item) !== id));

/** 지울 때 쓰는 자리 이름. 화면에서 목록 키로도 함께 쓴다. */
export const recentSearchId = identityOf;

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
