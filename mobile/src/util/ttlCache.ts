interface TtlCacheOptions {
  readonly ttlMs: number;
  readonly maxEntries: number;
}

interface TtlCacheEntry<T> {
  readonly expiresAt: number;
  readonly value: T;
}

interface TtlCache<T> {
  readonly get: (key: string) => T | null;
  readonly set: (key: string, value: T) => void;
}

export const createTtlCache = <T>({ ttlMs, maxEntries }: TtlCacheOptions): TtlCache<T> => {
  const entries = new Map<string, TtlCacheEntry<T>>();

  const prune = () => {
    const now = Date.now();

    entries.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        entries.delete(key);
      }
    });
  };

  const get = (key: string): T | null => {
    const entry = entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return null;
    }

    return entry.value;
  };

  const set = (key: string, value: T) => {
    prune();

    const oldest = entries.keys().next();
    if (entries.size >= maxEntries && !oldest.done) {
      entries.delete(oldest.value);
    }

    entries.set(key, { expiresAt: Date.now() + ttlMs, value });
  };

  return { get, set };
};
