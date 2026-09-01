import type { BrandResponse, ProductResponse } from "@poudy/api/api.zod";

import type { ScrollPosition } from "@/lib/navigation/scroll-anchor";

/**
 * 조건 하나에 대해 이어 붙인 목록 전체를 담는다.
 *
 * 첫 장만 담으면 되살렸을 때 문서 높이가 떠날 때보다 낮아 보던 자리로 되돌릴 수 없다.
 * 그래서 `page` 까지 쌓아 둔 `items` 를 통째로 들고 있는다.
 */
export type ProductPages = {
  /** 지금까지 받은 가장 마지막 장. 0 이면 첫 장만 받았다는 뜻이다. */
  readonly page: number;
  readonly items: readonly ProductResponse[];
  readonly brands: readonly BrandResponse[];
  readonly total: number;
  readonly hasNext: boolean;
  /**
   * 떠날 때 보던 자리.
   *
   * 오래된 목록은 되살린 뒤 다시 받아 오므로 항목이 달라질 수 있다. 그러면 위쪽
   * 높이가 바뀌어 픽셀값이 다른 제품을 가리킨다. 그래서 항목과 픽셀을 함께 담는다.
   */
  readonly position: ScrollPosition;
  /** 마지막으로 서버에서 받아 온 때. 되살릴 때 다시 받을지 판단하는 근거다. */
  readonly fetchedAt: number;
};

/**
 * 조건 몇 개까지 들고 있을지. 사용자가 오가는 것은 대개 직전 조건 한둘이고,
 * 목록 하나가 제품 수백 건까지 자랄 수 있어 넉넉히 두지 않는다.
 */
const LIMIT = 5;

/** 새로고침하면 사라지는 것이 맞다. 조건이 바뀐 목록을 되살려 보여 주지 않는다. */
const NO_POSITION: ScrollPosition = { scrollY: 0 };

const cache = new Map<string, ProductPages>();

/** 최근에 쓴 것을 뒤로 보낸다. `Map` 은 넣은 차례를 지키므로 앞쪽이 가장 오래된 것이다. */
const touch = (key: string, pages: ProductPages): void => {
  cache.delete(key);
  cache.set(key, pages);

  if (cache.size <= LIMIT) return;

  const oldest = cache.keys().next();
  if (!oldest.done) cache.delete(oldest.value);
};

export const readProductPages = (key: string): ProductPages | undefined => {
  const found = cache.get(key);
  if (found) touch(key, found);
  return found;
};

/** 보던 자리는 목록과 따로 움직이므로 이미 담아 둔 값을 지우지 않는다. */
export const writeProductPages = (key: string, pages: Omit<ProductPages, "position" | "fetchedAt">): void => {
  touch(key, { ...pages, position: cache.get(key)?.position ?? NO_POSITION, fetchedAt: Date.now() });
};

/** 목록을 담은 적이 없으면 자리만 남겨 두지 않는다. 되살릴 목록이 없으면 쓸모가 없다. */
export const rememberScrollPosition = (key: string, position: ScrollPosition): void => {
  const found = cache.get(key);
  if (!found) return;
  cache.set(key, { ...found, position });
};

export const clearProductPages = (): void => {
  cache.clear();
};
