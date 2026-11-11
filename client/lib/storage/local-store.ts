/**
 * localStorage 를 감싼다. 값을 읽을 때 다음을 견딘다.
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

/** localStorage 를 쓸 수 없으면 메모리로 대신한다. 한 세션 동안만 유지된다. */
const backend = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return undefined;
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const readRaw = (key: string): string | null => {
  try {
    return backend()?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
};

const writeRaw = (key: string, raw: string): void => {
  try {
    const store = backend();
    // 용량 초과 등으로 저장에 실패해도 화면 동작은 이어져야 한다.
    if (store) store.setItem(key, raw);
    else memory.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
};

const removeRaw = (key: string): void => {
  try {
    backend()?.removeItem(key);
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

export const createLocalStore = <T>(key: string, { version, fallback, isValid }: StoreSchema<T>): LocalStore<T> => {
  const read = (): T => {
    const raw = readRaw(key);
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
    writeRaw(key, JSON.stringify({ version, value } satisfies StoredShape<T>));
  };

  return { read, write, clear: () => removeRaw(key) };
};

export const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isInteger(item));
