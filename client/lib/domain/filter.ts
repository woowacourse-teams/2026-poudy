import { ExcludeCode, get_FindProducts, type ProductSort, SkinType } from "@poudy/api/api.zod";

import { firstOf, keepIf } from "./optional";

/** 서버 정렬 중 화면에서 고를 수 있는 것만 둔다. 순서는 드롭다운에 보이는 순서다. */
export const SORTS = [
  "DEFAULT",
  "PRICE_ASC",
  "PRICE_DESC",
  "UNIT_PRICE_ASC",
  "UNIT_PRICE_DESC",
] as const satisfies readonly ProductSort[];
export type Sort = (typeof SORTS)[number];

/** 서버는 성분군 코드를 문자열로 준다. 화면이 아는 성분군인지 여기서 가른다. */
export const isExcludeCode = (value: string): value is ExcludeCode => ExcludeCode.safeParse(value).success;

/** 서버 목록을 받기 전에도 조건을 이름으로 적을 수 있게 둔다. */
export const SKIN_TYPE_NAMES: Record<SkinType, string> = {
  DRY: "건성",
  OILY: "지성",
  SENSITIVE: "민감성",
  COMBINATION: "복합성",
};

/** 기본값과 범위는 서버 계약에서 생성한 /api/products 쿼리 스키마가 정한다. */
const PRODUCT_QUERY = get_FindProducts.parameters.query.unwrap().shape;

/** 서버 기본 정렬이 SORTS 에 없으면 filter.test 가 잡는다. */
export const DEFAULT_SORT: Sort =
  SORTS.find((sort) => sort === PRODUCT_QUERY.sort.unwrap().parse(undefined)) ?? SORTS[0];
export const DEFAULT_SIZE = PRODUCT_QUERY.size.unwrap().parse(undefined);
/** API 와 URL 모두 페이지를 1 부터 센다. */
export const FIRST_PAGE = 1;

type ProductQuery = Required<NonNullable<get_FindProducts["parameters"]["query"]>>;

type ReadonlyParam<T> = T extends readonly (infer E)[] ? readonly E[] : T;

/**
 * 탐색 조건. /api/products 의 쿼리 파라미터에서 만들어 서버에 조건이 늘면 여기서 타입 검사가 걸린다.
 * 검색어와 피부 타입은 걸지 않을 수 있고, 정렬은 화면에서 고를 수 있는 것만 받는다.
 * 화면은 이 객체를 따로 들고 있지 않고 URL 에서 매번 읽는다.
 */
export type Filter = {
  readonly [K in Exclude<keyof ProductQuery, "keyword" | "skinType" | "sort">]: ReadonlyParam<ProductQuery[K]>;
} & {
  readonly keyword?: string;
  /** 서버가 한 번에 하나만 받는다. 다른 조건과 AND 로 묶인다. */
  readonly skinType?: SkinType;
  readonly sort: Sort;
};

export const EMPTY_FILTER: Filter = {
  categoryIds: [],
  brandIds: [],
  moistureLevel: [],
  oilLevel: [],
  includeIngredientIds: [],
  excludeIngredientIds: [],
  excludeCodes: [],
  includeGroupCodes: [],
  excludeGroupCodes: [],
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

/** 수분감·유분감은 0(없음)도 고를 수 있는 값이라 ID 와 다르게 읽는다. 단계 범위는 서버 스키마로 거른다. */
const readLevels = (params: URLSearchParams, key: "moistureLevel" | "oilLevel"): readonly number[] =>
  readIntegers(params, key)
    .filter((value) => PRODUCT_QUERY[key].unwrap().element.safeParse(value).success)
    .toSorted((a, b) => a - b);

const readStrings = (params: URLSearchParams, key: string): readonly string[] =>
  unique(
    params
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean),
  );

const readCodes = (params: URLSearchParams): readonly ExcludeCode[] =>
  readStrings(params, "excludeCodes").filter(isExcludeCode);

const readSort = (params: URLSearchParams): Sort => SORTS.find((sort) => sort === params.get("sort")) ?? DEFAULT_SORT;

/** 서버가 단일 값만 받으므로 첫 값만 쓴다. 정해진 코드가 아니면 조건이 없는 것으로 본다. */
const readSkinType = (params: URLSearchParams): SkinType | undefined =>
  SkinType.options.find((skinType) => skinType === params.get("skinType"));

/** 서버 스키마의 범위를 벗어나면 기본값으로 되돌린다. */
const readCount = (params: URLSearchParams, key: "page" | "size", fallback: number): number => {
  const result = PRODUCT_QUERY[key].safeParse(params.get(key) ?? undefined);
  return firstOf(keepIf(result.success, result.data ?? fallback), fallback);
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
    includeGroupCodes: readStrings(params, "includeGroupCodes"),
    excludeGroupCodes: readStrings(params, "excludeGroupCodes"),
    sort: readSort(params),
    page: readCount(params, "page", FIRST_PAGE),
    size: readCount(params, "size", DEFAULT_SIZE),
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
    ...listEntries("includeGroupCodes", filter.includeGroupCodes),
    ...listEntries("excludeGroupCodes", filter.excludeGroupCodes),
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
  filter.includeGroupCodes.length > 0 ||
  filter.excludeGroupCodes.length > 0 ||
  Boolean(filter.skinType);

/** 조건을 바꾸면 페이지를 처음으로 되돌린다. 2 페이지에서 조건을 바꿔 빈 목록이 나오는 것을 막는다. */
export const withCondition = (filter: Filter, changed: Partial<Filter>): Filter => ({
  ...filter,
  ...changed,
  page: FIRST_PAGE,
});
