"use client";

import type { SkinChoice } from "@poudy/api/api.zod";
import { useEffect, useState } from "react";

import { fetchSkinTypes } from "@/lib/api/products";
import type { SkinNames } from "@/lib/domain/filter";

/**
 * 고른 피부 선택지의 이름을 가져온다. 이름은 `/api/skin-types` 만 정한다.
 * 피부 조건을 고르지 않았으면 이름을 적을 곳이 없으므로 묻지 않는다.
 */
export const useSkinNames = (choices: readonly SkinChoice[]): SkinNames => {
  const needed = choices.length > 0;
  const [names, setNames] = useState<SkinNames>(new Map());

  useEffect(() => {
    if (!needed || names.size > 0) return;

    const controller = new AbortController();

    fetchSkinTypes()
      .then((response) => {
        if (controller.signal.aborted) return;
        setNames(new Map(response.items.map((item) => [item.code, item.name])));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [needed, names.size]);

  return names;
};
