import type { Filter } from "./filter";
import { firstOf, keepIf, pick } from "./optional";
import { LEVEL_LABELS } from "./product-display";

/** 성분 ID 를 이름으로 바꾸기 위한 조회표. 화면이 이미 받아 둔 성분 목록에서 만든다. */
export type IngredientNames = ReadonlyMap<number, string>;

const nameOf = (names: IngredientNames, id: number): string => names.get(id) ?? `성분 ${id}`;

const ingredientParts = (filter: Filter, names: IngredientNames): readonly string[] => [
  ...filter.includeIngredientIds.map((id) => `${nameOf(names, id)} 포함`),
  ...filter.excludeIngredientIds.map((id) => `${nameOf(names, id)} 제외`),
];

const rangeLabel = (levels: readonly number[]): string => {
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  return pick(min === max, LEVEL_LABELS[min], `${LEVEL_LABELS[min]}–${LEVEL_LABELS[max]}`);
};

const levelPart = (label: string, levels: readonly number[]): readonly string[] =>
  keepIf(levels.length > 0, `${label} ${rangeLabel(levels)}`);

const countPart = (label: string, count: number): readonly string[] => keepIf(count > 0, `${label} ${count}개`);

/**
 * 디자인의 `판테놀 포함 · 리모넨 제외 · 빠른 필터 2개`.
 * 성분은 이름을 그대로 쓰고, 개수가 늘어나는 조건은 개수로 줄인다.
 */
export const summarizeFilter = (filter: Filter, names: IngredientNames = new Map()): string =>
  [
    ...keepIf(Boolean(filter.keyword), `'${filter.keyword}'`),
    ...ingredientParts(filter, names),
    ...levelPart("수분", filter.moistureLevel),
    ...levelPart("유분", filter.oilLevel),
    ...countPart("빠른 필터", filter.excludeCodes.length),
    ...countPart("카테고리", filter.categoryIds.length),
    ...countPart("브랜드", filter.brandIds.length),
  ].join(" · ");

/** 값이 몇 개든 조건 하나로 세는 항목. 수분과 유분이 그렇다. */
const countAsOne = (levels: readonly number[]): number => firstOf(keepIf(levels.length > 0, 1), 0);

/** 적용 조건 개수. 디자인의 `탐색 조건 8` 배지에 쓴다. */
export const countConditions = (filter: Filter): number =>
  firstOf(keepIf(Boolean(filter.keyword), 1), 0) +
  filter.categoryIds.length +
  filter.brandIds.length +
  filter.includeIngredientIds.length +
  filter.excludeIngredientIds.length +
  filter.excludeCodes.length +
  countAsOne(filter.moistureLevel) +
  countAsOne(filter.oilLevel);
