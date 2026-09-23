import type { Endpoints } from "@poudy/api/api.zod.types";

import { firstOf, keepIf } from "./optional";

type ServerSort = NonNullable<NonNullable<Endpoints.get_FindProducts["parameters"]["query"]>["sort"]>;

/** 서버가 받지 않는 값이 섞이면 타입 검사에서 걸리게 한다. 순서는 드롭다운에 보이는 순서다. */
export const SORTS = [
  "DEFAULT",
  "PRICE_ASC",
  "PRICE_DESC",
  "UNIT_PRICE_ASC",
  "UNIT_PRICE_DESC",
] as const satisfies readonly ServerSort[];
export type Sort = (typeof SORTS)[number];

export const EXCLUDE_CODES = [
  "FRAGRANCE_ALLERGENS",
  "DRYING_ALCOHOLS",
  "HARSH_PRESERVATIVES",
  "SULFATES",
  "CYCLIC_SILICONES",
  "SYNTHETIC_COLORANTS",
] as const;
export type ExcludeCode = (typeof EXCLUDE_CODES)[number];

export const SKIN_TYPES = ["DRY", "OILY", "SENSITIVE", "COMBINATION"] as const;
export type SkinType = (typeof SKIN_TYPES)[number];

export const DEFAULT_SORT: Sort = "DEFAULT";
export const DEFAULT_SIZE = 20;
/** API 와 URL 모두 페이지를 1 부터 센다. */
export const FIRST_PAGE = 1;

/** 수분감·유분감은 0~3 단계다. */
const LEVEL_MIN = 0;
const LEVEL_MAX = 3;

/**
 * 탐색 조건. /api/products 의 쿼리 파라미터와 1:1 로 대응한다.
 * 화면은 이 객체를 따로 들고 있지 않고 URL 에서 매번 읽는다.
 */
export type Filter = {
  readonly keyword?: string;
  readonly categoryIds: readonly number[];
  readonly brandIds: readonly number[];
  readonly moistureLevel: readonly number[];
  readonly oilLevel: readonly number[];
  readonly includeIngredientIds: readonly number[];
  readonly excludeIngredientIds: readonly number[];
  readonly excludeCodes: readonly ExcludeCode[];
  /** 서버가 한 번에 하나만 받는다. 다른 조건과 AND 로 묶인다. */
  readonly skinType?: SkinType;
  readonly sort: Sort;
  readonly page: number;
  readonly size: number;
};

export const EMPTY_FILTER: Filter = {
  categoryIds: [],
  brandIds: [],
  moistureLevel: [],
  oilLevel: [],
  includeIngredientIds: [],
  excludeIngredientIds: [],
  excludeCodes: [],
  sort: DEFAULT_SORT,
  page: FIRST_PAGE,
  size: DEFAULT_SIZE,
};

const unique = <T>(values: readonly T[]): readonly T[] => [...new Set(values)];

/**
 * 같은 키가 여러 번 오는 형태와 쉼표로 이어 붙인 형태를 모두 받는다.
 * 링크를 손으로 고치는 경우가 있어 둘 다 허용한다.
 */
const readIntegers = (params: URLSearchParams, key: string): readonly number[] =>
  unique(
    params
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => Number(value.trim()))
      .filter(Number.isInteger),
  );

/** ID 는 1 부터 시작한다. 0 이나 음수는 잘못된 값으로 본다. */
const readIds = (params: URLSearchParams, key: string): readonly number[] =>
  readIntegers(params, key).filter((value) => value > 0);

/** 수분감·유분감은 0(없음)도 고를 수 있는 값이라 ID 와 다르게 읽는다. */
const readLevels = (params: URLSearchParams, key: string): readonly number[] =>
  readIntegers(params, key)
    .filter((value) => value >= LEVEL_MIN && value <= LEVEL_MAX)
    .toSorted((a, b) => a - b);

const readCodes = (params: URLSearchParams): readonly ExcludeCode[] =>
  unique(
    params
      .getAll("excludeCodes")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim()),
  ).filter((value): value is ExcludeCode => EXCLUDE_CODES.includes(value as ExcludeCode));

const readSort = (params: URLSearchParams): Sort => SORTS.find((sort) => sort === params.get("sort")) ?? DEFAULT_SORT;

/** 서버가 단일 값만 받으므로 첫 값만 쓴다. 정해진 코드가 아니면 조건이 없는 것으로 본다. */
const readSkinType = (params: URLSearchParams): SkinType | undefined =>
  SKIN_TYPES.find((skinType) => skinType === params.get("skinType"));

/** 정수이고 최솟값 이상일 때만 쓴다. 아니면 기본값으로 되돌린다. */
const readCount = (
  params: URLSearchParams,
  key: string,
  bounds: { readonly fallback: number; readonly min: number },
): number => {
  const value = Number(params.get(key));
  const usable = Number.isInteger(value) && value >= bounds.min;
  return firstOf(keepIf(usable, value), bounds.fallback);
};

const readKeyword = (params: URLSearchParams): string | undefined => params.get("keyword")?.trim() || undefined;

/** 잘못된 값은 버리고 기본값으로 되돌린다. 링크를 직접 고쳐 들어와도 화면이 깨지지 않게 한다. */
export const parseFilter = (params: URLSearchParams): Filter => {
  const keyword = readKeyword(params);
  const skinType = readSkinType(params);

  return {
    // 검색어가 없을 때 keyword 키 자체를 두지 않아 EMPTY_FILTER 와 같은 모양이 되게 한다.
    ...Object.fromEntries(keepIf(Boolean(keyword), ["keyword", keyword])),
    // 피부 타입도 같은 이유로 조건이 없으면 키를 두지 않는다.
    ...Object.fromEntries(keepIf(Boolean(skinType), ["skinType", skinType])),
    categoryIds: readIds(params, "categoryIds"),
    brandIds: readIds(params, "brandIds"),
    moistureLevel: readLevels(params, "moistureLevel"),
    oilLevel: readLevels(params, "oilLevel"),
    includeIngredientIds: readIds(params, "includeIngredientIds"),
    excludeIngredientIds: readIds(params, "excludeIngredientIds"),
    excludeCodes: readCodes(params),
    sort: readSort(params),
    page: readCount(params, "page", { fallback: FIRST_PAGE, min: FIRST_PAGE }),
    size: readCount(params, "size", { fallback: DEFAULT_SIZE, min: 1 }),
  };
};

// URLSearchParams 생성자가 변경 가능한 배열을 요구해서 readonly 튜플을 쓰지 않는다.
type Entry = [string, string];

const listEntries = (key: string, values: readonly (number | string)[]): Entry[] =>
  values.map((value) => [key, String(value)]);

/** 기본값은 URL 에 남기지 않는다. 같은 조건이면 항상 같은 URL 이 되도록 순서를 고정한다. */
export const serializeFilter = (filter: Filter): URLSearchParams =>
  new URLSearchParams([
    ...keepIf<Entry>(Boolean(filter.keyword), ["keyword", filter.keyword ?? ""]),
    ...listEntries("categoryIds", filter.categoryIds),
    ...listEntries("brandIds", filter.brandIds),
    ...listEntries("moistureLevel", filter.moistureLevel),
    ...listEntries("oilLevel", filter.oilLevel),
    ...listEntries("includeIngredientIds", filter.includeIngredientIds),
    ...listEntries("excludeIngredientIds", filter.excludeIngredientIds),
    ...listEntries("excludeCodes", filter.excludeCodes),
    ...keepIf<Entry>(Boolean(filter.skinType), ["skinType", filter.skinType ?? ""]),
    ...keepIf<Entry>(filter.sort !== DEFAULT_SORT, ["sort", filter.sort]),
    ...keepIf<Entry>(filter.page !== FIRST_PAGE, ["page", String(filter.page)]),
    ...keepIf<Entry>(filter.size !== DEFAULT_SIZE, ["size", String(filter.size)]),
  ]);

/** 조건이 하나라도 걸려 있는지. 정렬과 페이지는 조건으로 보지 않는다. */
export const hasCondition = (filter: Filter): boolean =>
  Boolean(filter.keyword) ||
  filter.categoryIds.length > 0 ||
  filter.brandIds.length > 0 ||
  filter.moistureLevel.length > 0 ||
  filter.oilLevel.length > 0 ||
  filter.includeIngredientIds.length > 0 ||
  filter.excludeIngredientIds.length > 0 ||
  filter.excludeCodes.length > 0 ||
  Boolean(filter.skinType);

/** 조건을 바꾸면 페이지를 처음으로 되돌린다. 2 페이지에서 조건을 바꿔 빈 목록이 나오는 것을 막는다. */
export const withCondition = (filter: Filter, changed: Partial<Filter>): Filter => ({
  ...filter,
  ...changed,
  page: FIRST_PAGE,
});
