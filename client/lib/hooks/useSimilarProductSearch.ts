"use client";

import type { ProductSuggestionResponse } from "@poudy/api/api.zod";

import { useSuggestions } from "./useSuggestions";

import { fetchProductSuggestions } from "@/lib/api/products";

export const SIMILAR_SEARCH_LIMIT = 5;
const recentResults = new Map<string, readonly ProductSuggestionResponse[]>();

const fetcher = async (keyword: string, signal: AbortSignal): Promise<readonly ProductSuggestionResponse[]> => {
  const response = await fetchProductSuggestions(keyword, SIMILAR_SEARCH_LIMIT);
  if (signal.aborted) return [];
  const items = response.items.slice(0, SIMILAR_SEARCH_LIMIT);
  if (recentResults.size >= 20) recentResults.clear();
  recentResults.set(keyword, items);
  return items;
};

/** 공용 자동완성에 최대 5개 조회와 뒤로 가기용 목록 복원만 덧붙인다. */
export function useSimilarProductSearch(value: string, composing: boolean) {
  const keyword = value.trim();
  const search = useSuggestions(composing ? "" : value, fetcher);
  const cached = recentResults.get(keyword);
  const waiting = composing || search.keyword !== keyword || search.loading;
  const failed = !composing && search.keyword === keyword && search.failed;
  const status = !keyword ? "idle" : failed ? "error" : waiting && (!cached || composing) ? "loading" : "ready";
  const items = status === "idle" || status === "error" || composing ? [] : waiting ? (cached ?? []) : search.items;
  const retry = () => {
    recentResults.delete(keyword);
    search.retry();
  };
  return { keyword: search.keyword, status, items, retry };
}
