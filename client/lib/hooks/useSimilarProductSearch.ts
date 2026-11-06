"use client";

import type { ProductSuggestionResponse } from "@poudy/api/api.zod";
import { useEffect, useState } from "react";

import { fetchProductSuggestions } from "@/lib/api/products";

export const SIMILAR_SEARCH_LIMIT = 5;
type State = {
  readonly keyword: string;
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly items: readonly ProductSuggestionResponse[];
};

// 상세에서 돌아올 때 목록 높이와 선택 후보를 바로 복원한다. 회원 데이터는 담지 않는다.
const recentResults = new Map<string, readonly ProductSuggestionResponse[]>();
const rememberResults = (keyword: string, results: readonly ProductSuggestionResponse[]) => {
  const items = results.slice(0, SIMILAR_SEARCH_LIMIT);
  if (recentResults.size >= 20) recentResults.clear();
  recentResults.set(keyword, items);
  return items;
};
const initial = (keyword: string): State => {
  if (!keyword) return { keyword, status: "idle", items: [] };
  const cached = recentResults.get(keyword);
  return { keyword, status: cached ? "ready" : "loading", items: cached ?? [] };
};

export function useSimilarProductSearch(value: string, composing: boolean) {
  const keyword = value.trim();
  const [state, setState] = useState<State>(() => initial(keyword));
  const [attempt, setAttempt] = useState(0);
  const current = state.keyword === keyword ? state : initial(keyword);

  useEffect(() => {
    if (!keyword || composing) return;
    let active = true;
    const timer = setTimeout(() => {
      void fetchProductSuggestions(keyword, SIMILAR_SEARCH_LIMIT).then(
        (response) => {
          if (!active) return;
          setState({ keyword, status: "ready", items: rememberResults(keyword, response.items) });
        },
        () => {
          if (active) setState({ keyword, status: "error", items: [] });
        },
      );
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [keyword, composing, attempt]);

  const retry = () => {
    setState({ keyword, status: "loading", items: [] });
    setAttempt((previous) => previous + 1);
  };
  return { ...current, retry };
}
