import type { ScrollPosition } from "@/lib/navigation/scroll-anchor";

/** 담아 둔 목록에 캐시가 스스로 붙이는 값. */
export type Cached<T> = T & {
  /** 떠날 때 보던 자리. */
  readonly position: ScrollPosition;
  /** 마지막으로 서버에서 받아 온 때. 되살릴 때 다시 받을지 판단하는 근거다. */
  readonly fetchedAt: number;
};

/**
 * 되살린 목록을 이 시간이 지나면 다시 받는다. 카탈로그는 하루 단위로 바뀌므로
 * 상세를 보고 곧바로 돌아오는 길에는 요청을 한 번도 쓰지 않는다.
 */
export const STALE_MS = 5 * 60 * 1000;

const NO_POSITION: ScrollPosition = { scrollY: 0 };

/**
 * 조건별로 이어 붙인 목록을 담아 두었다가 되돌아왔을 때 되살린다.
 *
 * 첫 장만 담으면 문서 높이가 떠날 때보다 낮아 보던 자리로 되돌릴 수 없다. 그래서
 * 쌓아 둔 장을 통째로 맡기고, 캐시는 그것이 무엇인지 묻지 않는다.
 *
 * 새로고침하면 사라지는 것이 맞다. 조건이 바뀐 목록을 되살려 보여 주지 않는다.
 */
export const createListCache = <T>(limit: number) => {
  const cache = new Map<string, Cached<T>>();

  /** 최근에 쓴 것을 뒤로 보낸다. `Map` 은 넣은 차례를 지키므로 앞쪽이 가장 오래된 것이다. */
  const touch = (key: string, value: Cached<T>): void => {
    cache.delete(key);
    cache.set(key, value);

    if (cache.size <= limit) return;

    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  };

  return {
    read: (key: string): Cached<T> | undefined => {
      const found = cache.get(key);
      if (found) touch(key, found);
      return found;
    },

    /** 보던 자리는 목록과 따로 움직이므로 이미 담아 둔 값을 지우지 않는다. */
    write: (key: string, value: T): void => {
      touch(key, { ...value, position: cache.get(key)?.position ?? NO_POSITION, fetchedAt: Date.now() });
    },

    /**
     * 목록을 담은 적이 없으면 자리만 남겨 두지 않는다. 되살릴 목록이 없으면 쓸모가 없다.
     * 재는 일은 되살릴 목록이 있을 때만 시킨다. 자리를 재려면 화면을 훑어야 한다.
     */
    rememberPosition: (key: string, read: () => ScrollPosition): void => {
      const found = cache.get(key);
      if (!found) return;
      cache.set(key, { ...found, position: read() });
    },

    clear: (): void => {
      cache.clear();
    },
  };
};
