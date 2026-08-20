import { createLocalStore, isNumberArray } from "./local-store";

const store = createLocalStore<number[]>("poudy.saved-products.v1", {
  version: 1,
  fallback: [],
  isValid: isNumberArray,
});

/** 저장 목록이 바뀌면 구독자에게 알린다. 같은 화면의 여러 카드가 함께 갱신되게 한다. */
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeSavedProducts = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// useSyncExternalStore 는 값이 같으면 같은 참조를 돌려받아야 다시 그리지 않는다.
let snapshot: readonly number[] = store.read();

export const getSavedProductsSnapshot = (): readonly number[] => snapshot;

/** 서버에는 저장 목록이 없다. 첫 HTML 이 어긋나지 않게 빈 목록을 쓴다. */
const SERVER_SNAPSHOT: readonly number[] = [];

export const getSavedProductsServerSnapshot = (): readonly number[] => SERVER_SNAPSHOT;

const commit = (next: readonly number[]): readonly number[] => {
  snapshot = next;
  store.write([...next]);
  notify();
  return next;
};

/** 저장함 목록. 서버는 ID 를 받아 표시 정보만 채워 주므로 목록 자체는 브라우저가 가진다. */
export const readSavedProductIds = (): readonly number[] => store.read();

export const isSaved = (productId: number): boolean => snapshot.includes(productId);

/** 최근에 저장한 것이 앞에 오게 한다. 디자인의 `최근 저장순` 정렬과 맞춘다. */
export const saveProduct = (productId: number): readonly number[] =>
  commit([productId, ...snapshot.filter((id) => id !== productId)]);

export const unsaveProduct = (productId: number): readonly number[] =>
  commit(snapshot.filter((id) => id !== productId));

export const toggleSaved = (productId: number): readonly number[] =>
  isSaved(productId) ? unsaveProduct(productId) : saveProduct(productId);

export const clearSavedProducts = (): void => {
  snapshot = [];
  store.clear();
  notify();
};

/** localStorage 를 직접 지운 테스트에서 메모리 스냅샷을 다시 맞춘다. */
export const refreshSavedProducts = (): void => {
  snapshot = store.read();
  notify();
};
