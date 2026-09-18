"use client";

import type { ProductPageResponse } from "@poudy/api/api.zod";
import { useEffect, useState } from "react";

import { fetchProducts } from "@/lib/api/products";
import { type Filter, parseFilter, serializeFilter } from "@/lib/domain/filter";
import { type FilterFacet, filterForOptions } from "@/lib/domain/filter-options";

type Options = Pick<ProductPageResponse, "brands" | "categories" | "skinTypes">;
type Result =
  | { readonly key: string; readonly status: "ready"; readonly options: Options }
  | { readonly key: string; readonly status: "error" };

/** 요청 수명과 표시 상태를 맡는다. 이전 조건의 늦은 응답은 새 선택지를 덮어쓰지 않는다. */
export function useFilterOptions(filter: Filter, facet: FilterFacet) {
  const key = serializeFilter(filterForOptions(filter, facet)).toString();
  const [result, setResult] = useState<Result>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchProducts(parseFilter(new URLSearchParams(key)))
      .then(({ brands, categories, skinTypes }) => {
        if (active) setResult({ key, status: "ready", options: { brands, categories, skinTypes } });
      })
      .catch(() => {
        if (active) setResult({ key, status: "error" });
      });
    return () => {
      active = false;
    };
  }, [key, attempt]);

  const retry = () => {
    setResult(undefined);
    setAttempt((previous) => previous + 1);
  };
  return { result: result?.key === key ? result : undefined, retry };
}
