"use client";

import { useEffect, useRef, useState } from "react";

import { fetchMyFilterMatches } from "@/lib/api/products";

const NONE: ReadonlySet<number> = new Set();

/**
 * 목록에 보이는 제품 가운데 나만의 필터에 걸린 제품(#1245). 나만의 필터를 끈 목록에서만 묻는다.
 * 켠 목록은 서버가 걸린 제품을 빼고 주므로 묻지 않는다. 장을 이어 붙이면 처음 보는 제품만 묻는다.
 * 묻지 못하면 태그 없이 둔다. 태그는 덧붙인 정보라 목록을 막지 않고, 다음에 장이 바뀔 때 다시 묻는다.
 */
export const useMyFilterMatches = (productIds: readonly number[], enabled: boolean): ReadonlySet<number> => {
  const [matched, setMatched] = useState<ReadonlySet<number>>(NONE);
  const asked = useRef(new Set<number>());
  const mounted = useRef(true);
  const key = productIds.join(",");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || key === "") return;
    const fresh = [...new Set(key.split(",").map(Number))].filter((id) => !asked.current.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) asked.current.add(id);

    fetchMyFilterMatches(fresh).then(
      (ids) => {
        if (!mounted.current || ids.length === 0) return;
        setMatched((previous) => new Set([...previous, ...ids]));
      },
      () => {
        for (const id of fresh) asked.current.delete(id);
      },
    );
  }, [enabled, key]);

  return enabled ? matched : NONE;
};
