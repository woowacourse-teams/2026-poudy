import { createLocalStore } from "./local-store";

/**
 * 디자인(S01)의 최근 탐색 조건 카드. 조건을 통째로 들고 있지 않고 URL 쿼리로 저장한다.
 * 조건 모양이 바뀌어도 저장된 값을 옮길 필요가 없다.
 */
export type RecentFilter = {
  readonly query: string;
  readonly summary: string;
  readonly usedAt: number;
};

const MAX = 5;

const isRecentFilters = (value: unknown): value is RecentFilter[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as RecentFilter).query === "string" &&
      typeof (item as RecentFilter).summary === "string" &&
      typeof (item as RecentFilter).usedAt === "number",
  );

const store = createLocalStore<RecentFilter[]>("poudy.recent-filters.v1", {
  version: 1,
  fallback: [],
  isValid: isRecentFilters,
});

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeRecentFilters = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

let snapshot: readonly RecentFilter[] = store.read();

export const getRecentFiltersSnapshot = (): readonly RecentFilter[] => snapshot;

/** 서버에는 최근 조건이 없다. 첫 HTML 이 어긋나지 않게 빈 목록을 쓴다. */
const SERVER_SNAPSHOT: readonly RecentFilter[] = [];

export const getRecentFiltersServerSnapshot = (): readonly RecentFilter[] => SERVER_SNAPSHOT;

export const readRecentFilters = (): readonly RecentFilter[] => store.read();

/** 같은 조건을 다시 쓰면 시각만 새로 고쳐 위로 올린다. */
export const addRecentFilter = (
  filter: Omit<RecentFilter, "usedAt">,
  usedAt: number = Date.now(),
): readonly RecentFilter[] => {
  const next = [{ ...filter, usedAt }, ...snapshot.filter((item) => item.query !== filter.query)].slice(0, MAX);

  snapshot = next;
  store.write([...next]);
  notify();
  return next;
};

export const clearRecentFilters = (): void => {
  snapshot = [];
  store.clear();
  notify();
};
