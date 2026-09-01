import type { ProductSuggestionResponse } from "@poudy/api/api.zod";

import { createListCache } from "./list-cache";

/** 검색어 하나에 대해 이어 붙인 제품 제안 전체. */
export type SuggestionPages = {
  /** 지금까지 받은 가장 마지막 장. 0 이면 첫 장만 받았다는 뜻이다. */
  readonly page: number;
  readonly items: readonly ProductSuggestionResponse[];
  readonly total: number;
  readonly hasNext: boolean;
};

/** 검색어는 조건보다 자주 바뀌지만 오가는 것은 대개 직전 것 한둘이다. */
const LIMIT = 5;

const cache = createListCache<SuggestionPages>(LIMIT);

export const readSuggestionPages = cache.read;
export const writeSuggestionPages = cache.write;
export const rememberSuggestionPosition = cache.rememberPosition;
export const clearSuggestionPages = cache.clear;
