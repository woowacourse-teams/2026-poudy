import { createLocalStore } from "./local-store";

import { COMPARISON_MAX } from "@/lib/domain/product-comparison";

export { COMPARISON_MAX };

/**
 * 비교함에 담은 제품. 띠의 사진과 이름은 서버에 묻지 않고 그리도록 담을 때 함께 적어 둔다.
 * `partId` 는 고른 구성품이다. 없으면 서버가 첫 구성품을 고른다.
 */
export type ComparisonItem = {
  readonly productId: number;
  readonly name: string;
  readonly brandName: string;
  readonly imageUrl: string;
  readonly partId?: number;
};

export type ComparisonTray = {
  readonly items: readonly ComparisonItem[];
  /** 띠를 오른쪽 아래 알약으로 접었는지. 담은 제품은 그대로다. */
  readonly collapsed: boolean;
};

const EMPTY: ComparisonTray = { items: [], collapsed: false };

const isComparisonItem = (value: unknown): value is ComparisonItem => {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<ComparisonItem>;
  return (
    typeof item.productId === "number" &&
    typeof item.name === "string" &&
    typeof item.brandName === "string" &&
    typeof item.imageUrl === "string" &&
    (item.partId === undefined || typeof item.partId === "number")
  );
};

const isComparisonTray = (value: unknown): value is ComparisonTray => {
  if (typeof value !== "object" || value === null) return false;
  const tray = value as Partial<ComparisonTray>;
  return (
    typeof tray.collapsed === "boolean" &&
    Array.isArray(tray.items) &&
    tray.items.length <= COMPARISON_MAX &&
    tray.items.every(isComparisonItem)
  );
};

const store = createLocalStore<ComparisonTray>("poudy.comparison-tray", {
  version: 1,
  fallback: EMPTY,
  isValid: isComparisonTray,
});

const listeners = new Set<() => void>();

export const subscribeComparisonTray = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

let snapshot: ComparisonTray = store.read();

export const getComparisonTraySnapshot = (): ComparisonTray => snapshot;

/** 서버에는 비교함이 없다. 첫 HTML 이 어긋나지 않게 빈 비교함을 쓴다. */
export const getComparisonTrayServerSnapshot = (): ComparisonTray => EMPTY;

const commit = (next: ComparisonTray): void => {
  snapshot = next;
  store.write(next);
  listeners.forEach((listener) => listener());
};

/** 이미 담았으면 그대로 두고, 가득 찼으면 담지 않고 알린다. */
export const addComparisonItem = (item: ComparisonItem): "added" | "full" => {
  if (snapshot.items.some(({ productId }) => productId === item.productId)) return "added";
  if (snapshot.items.length >= COMPARISON_MAX) return "full";
  commit({ ...snapshot, items: [...snapshot.items, item] });
  return "added";
};

/** 비면 접은 상태도 풀어, 다음에 담을 때 띠가 펼쳐져 나타나게 한다. */
export const removeComparisonItem = (productId: number): void => {
  const items = snapshot.items.filter((item) => item.productId !== productId);
  commit({ items, collapsed: items.length > 0 && snapshot.collapsed });
};

export const selectComparisonPart = (productId: number, partId: number): void => {
  commit({
    ...snapshot,
    items: snapshot.items.map((item) => (item.productId === productId ? { ...item, partId } : item)),
  });
};

export const setComparisonCollapsed = (collapsed: boolean): void => {
  commit({ ...snapshot, collapsed });
};

export const clearComparisonTray = (): void => {
  snapshot = EMPTY;
  store.clear();
  listeners.forEach((listener) => listener());
};

/** localStorage 를 직접 지운 테스트에서 메모리 스냅샷을 다시 맞춘다. */
export const refreshComparisonTray = (): void => {
  snapshot = store.read();
  listeners.forEach((listener) => listener());
};
