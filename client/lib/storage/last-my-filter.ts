import { createLocalStore } from "./local-store";

const isLastMyFilterCount = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);

/**
 * 이 기기에서 마지막으로 읽은 나만의 필터의 성분 수. 로그인 전이었으면 null 이다.
 * 정적 페이지는 서버가 회원 상태를 모르므로, 읽는 동안 이 값으로 그려 읽은 뒤에도 모양이 바뀌지 않게 한다.
 */
const store = createLocalStore<number | null>("poudy.last-my-filter.v1", {
  version: 1,
  fallback: null,
  isValid: isLastMyFilterCount,
});

export const readLastMyFilterCount = (): number | null => store.read();

export const rememberLastMyFilterCount = (count: number | null): void => store.write(count);

export const clearLastMyFilterCount = (): void => store.clear();
