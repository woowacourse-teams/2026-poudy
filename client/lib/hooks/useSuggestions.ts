"use client";

import { useEffect, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

import { track } from "@/lib/analytics/track";

const trackSearch = (mode: "product" | "ingredient", query: string, resultCount: number): void => {
  track("search_used", { mode, query, query_length: query.length, result_count: resultCount });
};

type State<T> = {
  readonly keyword: string;
  readonly items: readonly T[];
};

/**
 * 검색어가 멈춘 뒤에만 조회한다.
 * 앞선 요청이 늦게 도착해 최신 결과를 덮어쓰지 않도록 취소한다.
 */
export const useSuggestions = <T>(
  keyword: string,
  fetcher: (keyword: string, signal: AbortSignal) => Promise<readonly T[]>,
  /** 검색 이벤트를 남길 화면. 없으면 남기지 않는다. */
  mode?: "product" | "ingredient",
) => {
  const debounced = useDebouncedValue(keyword.trim());
  const [state, setState] = useState<State<T>>({ keyword: debounced, items: [] });

  // 검색어가 바뀌면 렌더링 중에 결과를 비운다. 이전 검색어의 결과가 잠깐 보이지 않게 한다.
  const current = state.keyword === debounced ? state : { keyword: debounced, items: [] };
  if (state.keyword !== debounced) setState(current);

  useEffect(() => {
    if (!debounced) return;

    const controller = new AbortController();

    fetcher(debounced, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.keyword === debounced ? { ...previous, items: next } : previous));

        // 검색어가 멈춘 뒤 한 번만 남긴다. 글자마다 보내면 이벤트가 검색어 길이만큼 부풀어 오른다.
        if (mode) trackSearch(mode, debounced, next.length);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.keyword === debounced ? { ...previous, items: [] } : previous));
      });

    return () => controller.abort();
  }, [debounced, fetcher, mode]);

  return { items: current.items, keyword: debounced };
};
