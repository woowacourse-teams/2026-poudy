"use client";

import { useEffect, useState } from "react";

import { fetchIngredientsByIds } from "@/lib/api/products";

/**
 * 조건에 담긴 성분 ID 의 이름을 가져온다.
 * URL 에는 ID 만 남으므로 링크로 들어와도 이름을 보여 주려면 서버에 물어야 한다.
 */
export const useIngredientNames = (ids: readonly number[]): ReadonlyMap<number, string> => {
  // 같은 성분이 여러 조건에 함께 실려 올 수 있다(링크 충돌로 뺀 성분 등). 서버는 중복 ID 를 400 으로 거절하므로 한 번씩만 묻는다.
  const key = [...new Set(ids)].sort((a, b) => a - b).join(",");
  const [names, setNames] = useState<ReadonlyMap<number, string>>(new Map());

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();

    const ingredientIds = key.split(",").map(Number);

    fetchIngredientsByIds(ingredientIds)
      .then((response) => {
        if (controller.signal.aborted) return;
        setNames(new Map(response.items.map((item) => [item.id, item.koreanName])));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [key]);

  return names;
};
