import type { ExcludeCodeResponse } from "@poudy/api/api.zod";

import type { FilterChipItem } from "@/components/ui/FilterChipBar";
import type { Filter } from "@/lib/domain/filter";

/**
 * 성분 칩의 숫자. 빠른 필터는 성분을 묶어 둔 것이라 묶음 하나가 아니라 그 안의 성분 수로 센다.
 * 낱개로 고른 성분과 겹칠 수 있으므로 한 번만 세도록 모아서 헤아린다.
 */
const countIngredients = (filter: Filter, excludeCodes: readonly ExcludeCodeResponse[]): number => {
  const picked = new Set<number>(filter.excludeIngredientIds);

  for (const code of excludeCodes) {
    if (!filter.excludeCodes.includes(code.code)) continue;
    for (const ingredient of code.ingredients) picked.add(ingredient.id);
  }

  return picked.size;
};

export const chipsOf = (filter: Filter, excludeCodes: readonly ExcludeCodeResponse[]): readonly FilterChipItem[] => [
  {
    id: "ingredient",
    label: "성분",
    count: countIngredients(filter, excludeCodes),
  },
  { id: "category", label: "카테고리", count: filter.categoryIds.length },
  { id: "brand", label: "브랜드", count: filter.brandIds.length },
  {
    id: "level",
    label: "유수분",
    count: (filter.moistureLevel.length > 0 ? 1 : 0) + (filter.oilLevel.length > 0 ? 1 : 0),
  },
];
