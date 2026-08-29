import { createLocalStore, isNumberArray } from "./local-store";

/** 저장한 제품과 담은 때. 언제 담았는지 보여 주거나 기기끼리 맞출 때 쓴다. */
export type SavedProduct = {
  readonly id: number;
  readonly savedAt: string;
};

const isSavedProducts = (value: unknown): value is SavedProduct[] =>
  Array.isArray(value) &&
  value.every(
    (item): item is SavedProduct =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as SavedProduct).id === "number" &&
      Number.isInteger((item as SavedProduct).id) &&
      typeof (item as SavedProduct).savedAt === "string",
  );

const KEY = "poudy.saved-products.v2";

const store = createLocalStore<SavedProduct[]>(KEY, {
  version: 2,
  fallback: [],
  isValid: isSavedProducts,
});

/*
 * 번호만 담던 예전 형식이다. 담은 때를 알 수 없어 지금 시각으로 채운다.
 * 차례는 그대로 두므로 최근 저장순은 옮긴 뒤에도 어긋나지 않는다.
 */
const legacyStore = createLocalStore<number[]>("poudy.saved-products.v1", {
  version: 1,
  fallback: [],
  isValid: isNumberArray,
});

const migrate = (): SavedProduct[] => {
  const legacy = legacyStore.read();
  if (legacy.length === 0) return [];

  const now = new Date().toISOString();
  const moved = legacy.map((id) => ({ id, savedAt: now }));
  store.write(moved);
  legacyStore.clear();
  return moved;
};

const load = (): SavedProduct[] => {
  const saved = store.read();
  return saved.length > 0 ? saved : migrate();
};

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
let saved: readonly SavedProduct[] = load();
let snapshot: readonly number[] = saved.map((item) => item.id);

export const getSavedProductsSnapshot = (): readonly number[] => snapshot;

/** 서버에는 저장 목록이 없다. 첫 HTML 이 어긋나지 않게 빈 목록을 쓴다. */
const SERVER_SNAPSHOT: readonly number[] = [];

export const getSavedProductsServerSnapshot = (): readonly number[] => SERVER_SNAPSHOT;

const commit = (next: readonly SavedProduct[]): readonly number[] => {
  saved = next;
  snapshot = next.map((item) => item.id);
  store.write([...next]);
  notify();
  return snapshot;
};

/** 저장함 목록. 서버는 ID 를 받아 표시 정보만 채워 주므로 목록 자체는 브라우저가 가진다. */
export const readSavedProductIds = (): readonly number[] => load().map((item) => item.id);

/** 저장한 제품과 담은 때. 최근에 담은 것이 앞에 온다. */
export const readSavedProducts = (): readonly SavedProduct[] => load();

/** 그 제품을 언제 담았는지. 담은 적이 없으면 undefined 다. */
export const savedAtOf = (productId: number): string | undefined =>
  saved.find((item) => item.id === productId)?.savedAt;

export const isSaved = (productId: number): boolean => snapshot.includes(productId);

/** 최근에 저장한 것이 앞에 오게 한다. 디자인의 `최근 저장순` 정렬과 맞춘다. */
export const saveProduct = (productId: number): readonly number[] =>
  commit([{ id: productId, savedAt: new Date().toISOString() }, ...saved.filter((item) => item.id !== productId)]);

export const unsaveProduct = (productId: number): readonly number[] =>
  commit(saved.filter((item) => item.id !== productId));

export const toggleSaved = (productId: number): readonly number[] =>
  isSaved(productId) ? unsaveProduct(productId) : saveProduct(productId);

export const clearSavedProducts = (): void => {
  saved = [];
  snapshot = [];
  store.clear();
  legacyStore.clear();
  notify();
};

/** localStorage 를 직접 지운 테스트에서 메모리 스냅샷을 다시 맞춘다. */
export const refreshSavedProducts = (): void => {
  saved = load();
  snapshot = saved.map((item) => item.id);
  notify();
};
