"use client";

import { useEffect, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

import { fetchProductCount } from "@/lib/api/products";
import { parseFilter, serializeFilter, type Filter } from "@/lib/domain/filter";

/**
 * 바텀시트에서 조건을 고르는 동안 결과 개수를 미리 보여 준다.
 * 조건은 아직 URL 에 넣지 않고, 적용 버튼을 눌렀을 때만 커밋한다.
 */
export const useProductCount = (filter: Filter, initialCount?: number) => useCountState(filter, initialCount).count;

/**
 * 개수와 함께 그 값이 지금 조건의 것인지도 돌려준다.
 *
 * 조건을 바꾸면 디바운스와 요청이 끝날 때까지 이전 개수가 남는다. 그 동안 화면에
 * 보이는 숫자는 이미 틀린 값이므로, 그대로 눌러 넘어가지 못하게 막아야 하는 쪽에서 쓴다.
 */
export const useCountState = (filter: Filter, initialCount?: number) => {
  // 객체는 렌더링마다 새 참조라 문자열로 디바운스한다.
  const key = serializeFilter(filter).toString();
  const debouncedKey = useDebouncedValue(key);

  const [count, setCount] = useState<number | undefined>(initialCount);
  // 어느 조건으로 센 값인지 함께 적어 둔다. 지금 조건과 다르면 아직 세는 중이다.
  const [countedKey, setCountedKey] = useState<string | undefined>(initialCount === undefined ? undefined : key);

  useEffect(() => {
    const controller = new AbortController();

    fetchProductCount(parseFilter(new URLSearchParams(debouncedKey)))
      .then((response) => {
        if (controller.signal.aborted) return;
        setCount(response.count);
        setCountedKey(debouncedKey);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCount(undefined);
        setCountedKey(undefined);
      });

    return () => controller.abort();
  }, [debouncedKey]);

  return { count, counting: countedKey !== key };
};
