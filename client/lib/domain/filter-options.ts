import { DEFAULT_SORT, type Filter } from "./filter";

export type FilterFacet = "brand" | "category" | "skinType";

const OMITTED_CONDITION: Record<FilterFacet, Partial<Filter>> = {
  brand: { brandIds: [] },
  category: { categoryIds: [] },
  skinType: { skinType: undefined },
};

/** 후보는 자기 조건만 빼고 찾는다. 후보 집계는 페이지 크기와 무관하므로 제품은 하나만 받는다. */
export const filterForOptions = (filter: Filter, facet: FilterFacet): Filter => ({
  ...filter,
  ...OMITTED_CONDITION[facet],
  sort: DEFAULT_SORT,
  page: 0,
  size: 1,
});
