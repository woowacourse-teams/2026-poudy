"use client";

import type { ProductSuggestionPageResponse, ProductSuggestionResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

import { track } from "@/lib/analytics/track";
import { fetchProductSuggestions } from "@/lib/api/products";

type State = {
  readonly keyword: string;
  readonly page: number;
  readonly items: readonly ProductSuggestionResponse[];
  /** 첫 응답 전에는 모르는 값이라 0 으로 두지 않는다. */
  readonly total: number | undefined;
  readonly hasNext: boolean;
  readonly loading: boolean;
};

const initial = (keyword: string): State => ({
  keyword,
  page: 0,
  items: [],
  total: undefined,
  hasNext: false,
  loading: Boolean(keyword),
});

const appended = (previous: State, response: ProductSuggestionPageResponse, page: number): State => ({
  ...previous,
  items: page === 0 ? response.items : [...previous.items, ...response.items],
  total: response.pagination.totalElements,
  hasNext: response.pagination.hasNext,
  loading: false,
});

const trackSearch = (query: string, resultCount: number): void => {
  track("search_used", { mode: "product", query, query_length: query.length, result_count: resultCount });
};

export const useProductSuggestions = (keyword: string) => {
  const debounced = useDebouncedValue(keyword.trim());
  const [state, setState] = useState<State>(() => initial(debounced));

  // effect 에서 비우면 한 번 더 그리므로 렌더링 중에 비운다.
  const current = state.keyword === debounced ? state : initial(debounced);
  if (state.keyword !== debounced) setState(current);

  const { page } = current;

  useEffect(() => {
    if (!debounced) return;

    const controller = new AbortController();

    fetchProductSuggestions(debounced, page)
      .then((response) => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.keyword === debounced ? appended(previous, response, page) : previous));
        if (page === 0) trackSearch(debounced, response.pagination.totalElements);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.keyword === debounced ? { ...previous, loading: false } : previous));
      });

    return () => controller.abort();
  }, [debounced, page]);

  const loadNext = useCallback(() => {
    setState((previous) => ({ ...previous, page: previous.page + 1, loading: true }));
  }, []);

  return { ...current, keyword: debounced, loadNext };
};
