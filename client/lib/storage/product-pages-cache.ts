import type {
  BrandResponse,
  CategoryResponse,
  ProductResponse,
  SkinTypeResponse,
  ProductFilterOptionsResponse,
} from "@poudy/api/api.zod";

import { createListCache } from "./list-cache";

import type { Filter } from "@/lib/domain/filter";

/** 조건 하나에 대해 이어 붙인 제품 목록 전체. */
export type ProductPages = {
  /** 목록이 시작한 장. 중간 장부터 들어왔거나 앞쪽 장을 붙였으면 1 이 아닐 수 있다. */
  readonly first: number;
  /** 지금까지 받은 가장 마지막 장. */
  readonly page: number;
  readonly items: readonly ProductResponse[];
  readonly filterOptions?: ProductFilterOptionsResponse;
  readonly brands: readonly BrandResponse[];
  readonly categories: readonly CategoryResponse[];
  readonly skinTypes: readonly SkinTypeResponse[];
  readonly total: number;
  readonly hasNext: boolean;
};

/**
 * 조건 몇 개까지 들고 있을지. 사용자가 오가는 것은 대개 직전 조건 한둘이고,
 * 목록 하나가 제품 수백 건까지 자랄 수 있어 넉넉히 두지 않는다.
 */
const LIMIT = 5;

const cache = createListCache<ProductPages>(LIMIT);

/**
 * 조건 하나를 가리키는 키. 주소의 `page` 는 목록이 시작할 장이라 조건과 함께 넣는다.
 * 서버가 그린 첫 장을 클라이언트가 같은 키로 알아본다.
 */
export const productPagesKey = (filter: Filter): string => JSON.stringify(filter);

export const readProductPages = cache.read;
export const writeProductPages = cache.write;
export const rememberScrollPosition = cache.rememberPosition;
export const clearProductPages = cache.clear;
