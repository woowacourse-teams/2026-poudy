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

export const readRecentFilters = (): readonly RecentFilter[] => store.read();

/** 같은 조건을 다시 쓰면 시각만 새로 고쳐 위로 올린다. */
export const addRecentFilter = (
  filter: Omit<RecentFilter, "usedAt">,
  usedAt: number = Date.now(),
): readonly RecentFilter[] => {
  const next = [{ ...filter, usedAt }, ...store.read().filter((item) => item.query !== filter.query)].slice(0, MAX);
  store.write(next);
  return next;
};

export const clearRecentFilters = (): void => store.clear();
