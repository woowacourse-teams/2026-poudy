"use client";

import { useEffect, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

import { fetchProductCount } from "@/lib/api/products";
import type { Filter } from "@/lib/domain/filter";

/**
 * 바텀시트에서 조건을 고르는 동안 결과 개수를 미리 보여 준다.
 * 조건은 아직 URL 에 넣지 않고, 적용 버튼을 눌렀을 때만 커밋한다.
 */
export const useProductCount = (filter: Filter) => {
  const debounced = useDebouncedValue(filter);
  const [count, setCount] = useState<number | undefined>();

  useEffect(() => {
    const controller = new AbortController();

    fetchProductCount(debounced)
      .then((response) => {
        // 뒤늦게 도착한 응답이 최신 값을 덮어쓰지 않게 한다.
        if (!controller.signal.aborted) setCount(response.count);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCount(undefined);
      });

    return () => controller.abort();
  }, [debounced]);

  return count;
};
