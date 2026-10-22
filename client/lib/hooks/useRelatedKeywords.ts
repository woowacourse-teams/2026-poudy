"use client";

import type { RelatedKeywordResponse } from "@poudy/api/api.zod";
import { useEffect, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

import { track } from "@/lib/analytics/track";
import { fetchProductCount, fetchRelatedKeywords } from "@/lib/api/products";
import { parseFilter } from "@/lib/domain/filter";

type State = {
  readonly keyword: string;
  readonly items: readonly RelatedKeywordResponse[];
  /** 검색어에 맞는 제품 전체 수. 세지 못했으면 비워 둔다. */
  readonly total?: number;
  readonly loading: boolean;
};

const initial = (keyword: string): State => ({ keyword, items: [], loading: Boolean(keyword) });

const trackSearch = (query: string, resultCount: number): void => {
  track("search_used", { mode: "product", query, query_length: query.length, result_count: resultCount });
};

const fulfilled = <T>(result: PromiseSettledResult<T>): T | undefined => {
  if (result.status === "fulfilled") return result.value;
  return undefined;
};

/** 둘은 따로 받는다. 연관검색어를 못 받아도 결과 수가 있으면 전체 보기와 엔터는 그대로 쓸 수 있다. */
const fetchResults = async (keyword: string): Promise<State> => {
  const [related, counted] = await Promise.allSettled([
    fetchRelatedKeywords(keyword),
    fetchProductCount(parseFilter(new URLSearchParams({ keyword }))),
  ]);
  return { keyword, items: fulfilled(related)?.items ?? [], total: fulfilled(counted)?.count, loading: false };
};

/**
 * 연관검색어와 검색 결과 수를 함께 받는다. 연관검색어 API 는 개수를 돌려주지 않아 같은 검색어로 개수를 따로 센다.
 * 검색어가 멈춘 뒤에만 조회하고, 앞선 요청이 늦게 도착해 최신 결과를 덮어쓰지 않게 버린다.
 */
export const useRelatedKeywords = (keyword: string) => {
  const trimmed = keyword.trim();
  const debounced = useDebouncedValue(trimmed);
  const [state, setState] = useState<State>(() => initial(debounced));

  // 검색어가 바뀌면 렌더링 중에 결과를 비운다. 이전 검색어의 결과가 잠깐 보이지 않게 한다.
  const current = state.keyword === debounced ? state : initial(debounced);
  if (state.keyword !== debounced) setState(current);

  useEffect(() => {
    if (!debounced) return;

    const controller = new AbortController();

    fetchResults(debounced).then((settled) => {
      if (controller.signal.aborted) return;
      setState(settled);

      // 검색어가 멈춘 뒤 한 번만 남긴다. 글자마다 보내면 이벤트가 검색어 길이만큼 부풀어 오른다.
      if (settled.total !== undefined) trackSearch(debounced, settled.total);
    });

    return () => controller.abort();
  }, [debounced]);

  return {
    items: current.items,
    total: current.total,
    keyword: debounced,
    loading: current.loading || trimmed !== debounced,
  };
};
