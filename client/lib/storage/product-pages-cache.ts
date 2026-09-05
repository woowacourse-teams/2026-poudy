import type { BrandResponse, CategoryResponse, ProductResponse } from "@poudy/api/api.zod";

import { createListCache } from "./list-cache";

/** 조건 하나에 대해 이어 붙인 제품 목록 전체. */
export type ProductPages = {
  /** 지금까지 받은 가장 마지막 장. 0 이면 첫 장만 받았다는 뜻이다. */
  readonly page: number;
  readonly items: readonly ProductResponse[];
  readonly brands: readonly BrandResponse[];
  readonly categories: readonly CategoryResponse[];
  readonly total: number;
  readonly hasNext: boolean;
};

/**
 * 조건 몇 개까지 들고 있을지. 사용자가 오가는 것은 대개 직전 조건 한둘이고,
 * 목록 하나가 제품 수백 건까지 자랄 수 있어 넉넉히 두지 않는다.
 */
const LIMIT = 5;

const cache = createListCache<ProductPages>(LIMIT);

export const readProductPages = cache.read;
export const writeProductPages = cache.write;
export const rememberScrollPosition = cache.rememberPosition;
export const clearProductPages = cache.clear;
