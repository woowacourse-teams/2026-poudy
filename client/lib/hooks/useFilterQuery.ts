"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { Filter } from "@/lib/domain/filter";
import { parseFilter, serializeFilter, withCondition } from "@/lib/domain/filter";

/** serializeFilter 가 만드는 키. 이 밖의 쿼리는 조건이 아니라 화면 상태다. */
const FILTER_KEYS = new Set([
  "keyword",
  "categoryIds",
  "brandIds",
  "moistureLevel",
  "oilLevel",
  "includeIngredientIds",
  "excludeIngredientIds",
  "excludeCodes",
  "sort",
  "page",
  "size",
]);

/**
 * 탐색 조건을 URL 에서 읽고 URL 로 쓴다.
 * 화면이 조건을 따로 들고 있지 않아 여러 화면이 같은 값을 본다.
 */
export const useFilterQuery = (path: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filter = useMemo(() => parseFilter(new URLSearchParams(searchParams.toString())), [searchParams]);

  /** 조건이 아닌 쿼리(mode 등)는 그대로 둔다. 조건만 갈아 끼운다. */
  const extra = useMemo(() => {
    const kept = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      if (!FILTER_KEYS.has(key)) kept.append(key, value);
    }
    return kept.toString();
  }, [searchParams]);

  const replace = useCallback(
    (next: Filter) => {
      const query = [serializeFilter(next).toString(), extra].filter(Boolean).join("&");
      router.replace(query ? `${path}?${query}` : path, { scroll: false });
    },
    [router, path, extra],
  );

  /** 조건을 바꾸면 페이지를 처음으로 되돌린다. */
  const setCondition = useCallback(
    (changed: Partial<Filter>) => replace(withCondition(filter, changed)),
    [filter, replace],
  );

  /** 정렬과 페이지는 조건이 아니므로 페이지를 되돌리지 않는다. */
  const setSort = useCallback((sort: Filter["sort"]) => replace({ ...filter, sort, page: 0 }), [filter, replace]);

  return { filter, setCondition, setSort, replace };
};
