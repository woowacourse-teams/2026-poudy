"use client";

import { useEffect, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

import { fetchProductCount } from "@/lib/api/products";
import { parseFilter, serializeFilter, type Filter } from "@/lib/domain/filter";

/**
 * 바텀시트에서 조건을 고르는 동안 결과 개수를 미리 보여 준다.
 * 조건은 아직 URL 에 넣지 않고, 적용 버튼을 눌렀을 때만 커밋한다.
 */
export const useProductCount = (filter: Filter, initialCount?: number) => {
  // 객체는 값이 같아도 렌더링마다 새로 만들어져 그대로 디바운스하면 요청이 끝없이 이어진다.
  const key = serializeFilter(filter).toString();
  const debouncedKey = useDebouncedValue(key);

  const [count, setCount] = useState<number | undefined>(initialCount);

  useEffect(() => {
    const controller = new AbortController();

    fetchProductCount(parseFilter(new URLSearchParams(debouncedKey)))
      .then((response) => {
        if (!controller.signal.aborted) setCount(response.count);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCount(undefined);
      });

    return () => controller.abort();
  }, [debouncedKey]);

  return count;
};
