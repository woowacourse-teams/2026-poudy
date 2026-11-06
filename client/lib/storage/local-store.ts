/**
 * localStorage·sessionStorage 를 감싼다. 값을 읽을 때 다음을 견딘다.
 *  - 서버 렌더링이라 window 가 없는 경우
 *  - 사생활 보호 모드 등으로 접근이 막힌 경우
 *  - 저장된 값이 JSON 이 아니거나 기대한 모양이 아닌 경우
 *  - 스키마 버전이 다른 경우
 *
 * 어느 쪽이든 화면을 죽이지 않고 기본값으로 되돌린다.
 */
export type StoredShape<T> = {
  readonly version: number;
  readonly value: T;
};

export type LocalStore<T> = {
  readonly read: () => T;
  readonly write: (value: T) => void;
  readonly clear: () => void;
};

const memory = new Map<string, string>();

type StorageKind = "localStorage" | "sessionStorage";

/** 브라우저 저장소를 쓸 수 없으면 메모리로 대신한다. 한 세션 동안만 유지된다. */
const storageOf = (kind: StorageKind) => {
  try {
    if (typeof window === "undefined" || !window[kind]) return undefined;
    return window[kind];
  } catch {
    return undefined;
  }
};

const readRaw = (kind: StorageKind, key: string): string | null => {
  try {
    return storageOf(kind)?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
};

const writeRaw = (kind: StorageKind, key: string, raw: string): void => {
  try {
    const store = storageOf(kind);
    // 용량 초과 등으로 저장에 실패해도 화면 동작은 이어져야 한다.
    if (store) store.setItem(key, raw);
    else memory.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
};

const removeRaw = (kind: StorageKind, key: string): void => {
  try {
    storageOf(kind)?.removeItem(key);
  } catch {
    // 지우지 못해도 할 수 있는 일이 없다.
  }
  memory.delete(key);
};

export type StoreSchema<T> = {
  /** 저장 형식을 바꿀 때 올린다. 값이 다르면 저장된 것을 버린다. */
  readonly version: number;
  readonly fallback: T;
  readonly isValid: (value: unknown) => value is T;
};

const createStore = <T>(
  kind: StorageKind,
  key: string,
  { version, fallback, isValid }: StoreSchema<T>,
): LocalStore<T> => {
  const read = (): T => {
    const raw = readRaw(kind, key);
    if (raw === null) return fallback;

    try {
      const parsed: unknown = JSON.parse(raw);
      const shaped = parsed as Partial<StoredShape<unknown>>;
      // 버전이 다르면 옮기지 않고 버린다. 담긴 것이 사용자가 다시 만들 수 있는 값이라 그렇다.
      if (shaped?.version !== version) return fallback;
      return isValid(shaped.value) ? shaped.value : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (value: T): void => {
    writeRaw(kind, key, JSON.stringify({ version, value } satisfies StoredShape<T>));
  };

  return { read, write, clear: () => removeRaw(kind, key) };
};

export const createLocalStore = <T>(key: string, schema: StoreSchema<T>): LocalStore<T> =>
  createStore("localStorage", key, schema);

/** 탭을 닫으면 사라지는 저장소. 새로고침과 같은 탭의 이동에는 남는다. */
export const createSessionStore = <T>(key: string, schema: StoreSchema<T>): LocalStore<T> =>
  createStore("sessionStorage", key, schema);

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isInteger(item));
