import { createLocalStore, isNumberArray } from "./local-store";

const store = createLocalStore<number[]>("poudy.saved-products.v1", {
  version: 1,
  fallback: [],
  isValid: isNumberArray,
});

/** 저장함 목록. 서버는 ID 를 받아 표시 정보만 채워 주므로 목록 자체는 브라우저가 가진다. */
export const readSavedProductIds = (): readonly number[] => store.read();

export const isSaved = (productId: number): boolean => store.read().includes(productId);

/** 최근에 저장한 것이 앞에 오게 한다. 디자인의 `최근 저장순` 정렬과 맞춘다. */
export const saveProduct = (productId: number): readonly number[] => {
  const next = [productId, ...store.read().filter((id) => id !== productId)];
  store.write(next);
  return next;
};

export const unsaveProduct = (productId: number): readonly number[] => {
  const next = store.read().filter((id) => id !== productId);
  store.write(next);
  return next;
};

export const toggleSaved = (productId: number): readonly number[] =>
  isSaved(productId) ? unsaveProduct(productId) : saveProduct(productId);

export const clearSavedProducts = (): void => store.clear();
