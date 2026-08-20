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
  // 객체는 렌더링마다 새 참조라 문자열로 디바운스한다.
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
