"use client";

import type { ProductSuggestionPageResponse, ProductSuggestionResponse } from "@poudy/api/api.zod";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

import { track } from "@/lib/analytics/track";
import { fetchProductSuggestions } from "@/lib/api/products";
import { applyScrollPosition, readScrollPosition } from "@/lib/navigation/scroll-anchor";
import { STALE_MS } from "@/lib/storage/list-cache";
import {
  readSuggestionPages,
  rememberSuggestionPosition,
  writeSuggestionPages,
} from "@/lib/storage/suggestion-pages-cache";

type State = {
  readonly keyword: string;
  readonly page: number;
  readonly items: readonly ProductSuggestionResponse[];
  readonly total: number | undefined;
  readonly hasNext: boolean;
  readonly loading: boolean;
  /** 아직 받아 오지 않은 장. 없으면 받을 것이 없다. */
  readonly pendingPage?: number;
  /** 캐시에서 되살렸는지. 보던 자리로 되돌릴 대상인지 가른다. */
  readonly restored: boolean;
  /** 되살린 장이 오래되어 다시 받는 중인지. 그동안에도 담아 둔 결과를 보여 준다. */
  readonly revalidating: boolean;
};

type SetState = Dispatch<SetStateAction<State>>;

const blank = (keyword: string): State => ({
  keyword,
  page: 0,
  items: [],
  total: undefined,
  hasNext: false,
  loading: Boolean(keyword),
  pendingPage: keyword ? 0 : undefined,
  restored: false,
  revalidating: false,
});

/**
 * 담아 둔 검색어면 이어 붙인 결과를 통째로 되살린다.
 * 첫 그리기부터 문서 높이가 살아 있어야 보던 자리로 되돌릴 수 있다.
 */
const initial = (keyword: string): State => {
  const cached = keyword ? readSuggestionPages(keyword) : undefined;
  if (!cached) return blank(keyword);

  const { page, items, total, hasNext, fetchedAt } = cached;
  return {
    keyword,
    page,
    items,
    total,
    hasNext,
    loading: false,
    pendingPage: undefined,
    restored: true,
    revalidating: Date.now() - fetchedAt > STALE_MS,
  };
};

const appended = (previous: State, response: ProductSuggestionPageResponse, page: number): State => ({
  ...previous,
  items: page === 0 ? response.items : [...previous.items, ...response.items],
  total: response.pagination.totalElements,
  hasNext: response.pagination.hasNext,
  loading: false,
  pendingPage: undefined,
});

const trackSearch = (query: string, resultCount: number): void => {
  track("search_used", { mode: "product", query, query_length: query.length, result_count: resultCount });
};

const useFetchPage = (keyword: string, state: State, setState: SetState) => {
  const { pendingPage } = state;

  useEffect(() => {
    if (!keyword || pendingPage === undefined) return;

    const controller = new AbortController();
    const keep = (update: (previous: State) => State) => {
      if (controller.signal.aborted) return;
      setState((previous) => (previous.keyword === keyword ? update(previous) : previous));
    };

    fetchProductSuggestions(keyword, pendingPage)
      .then((response) => {
        keep((previous) => appended(previous, response, pendingPage));
        if (!controller.signal.aborted && pendingPage === 0) {
          trackSearch(keyword, response.pagination.totalElements);
        }
      })
      .catch(() => keep((previous) => ({ ...previous, loading: false, pendingPage: undefined })));

    return () => controller.abort();
  }, [keyword, pendingPage, setState]);
};

/** 쌓아 둔 장을 전부 다시 받는다. 첫 장만 받으면 이어 붙인 결과가 덮인다. */
const refetchPages = (keyword: string, lastPage: number): Promise<readonly ProductSuggestionPageResponse[]> =>
  Promise.all(Array.from({ length: lastPage + 1 }, (_, page) => fetchProductSuggestions(keyword, page)));

const revalidated = (previous: State, responses: readonly ProductSuggestionPageResponse[]): State => {
  const last = responses[responses.length - 1];
  return {
    ...previous,
    items: responses.flatMap((response) => response.items),
    total: last.pagination.totalElements,
    hasNext: last.pagination.hasNext,
    revalidating: false,
  };
};

/** 오래된 결과만 다시 받는다. 받는 동안에도 담아 둔 결과를 그대로 보여 준다. */
const useRevalidate = (keyword: string, state: State, setState: SetState) => {
  const { revalidating, page } = state;

  useEffect(() => {
    if (!revalidating) return;

    const controller = new AbortController();
    const keep = (update: (previous: State) => State) => {
      if (controller.signal.aborted) return;
      setState((previous) => (previous.keyword === keyword ? update(previous) : previous));
    };

    refetchPages(keyword, page)
      .then((responses) => keep((previous) => revalidated(previous, responses)))
      .catch(() => keep((previous) => ({ ...previous, revalidating: false })));

    return () => controller.abort();
  }, [keyword, revalidating, page, setState]);
};

/** 장이 늘 때마다 담아 둔다. 보던 자리는 상태를 바꾸지 않으므로 따로 적어 둔다. */
const useRememberPages = (keyword: string, state: State) => {
  const { loading, revalidating, page, items, total, hasNext } = state;

  useEffect(() => {
    if (!keyword || loading || revalidating || total === undefined) return;
    writeSuggestionPages(keyword, { page, items, total, hasNext });
  }, [keyword, loading, revalidating, page, items, total, hasNext]);

  /* 목록과 같다. 보던 자리는 떠나는 순간에만 잰다. */
  useLayoutEffect(() => {
    if (!keyword) return;
    return () => rememberSuggestionPosition(keyword, readScrollPosition);
  }, [keyword]);
};

/**
 * 되살린 결과가 그려진 뒤에 보던 자리로 되돌린다. 다시 받아 온 결과로 갈아 끼우면
 * 항목 위쪽 높이가 달라질 수 있어 한 번 더 맞춘다. 그사이 사용자가 스크롤했으면 두지 않는다.
 */
const useRestoreScroll = (keyword: string, state: State) => {
  const applied = useRef<string>(undefined);
  const landed = useRef(0);

  useLayoutEffect(() => {
    if (!state.restored) return;
    if (applied.current === keyword && window.scrollY !== landed.current) return;

    applied.current = keyword;
    const position = readSuggestionPages(keyword)?.position;
    if (!position) return;

    applyScrollPosition(position);
    landed.current = window.scrollY;
  }, [keyword, state.restored, state.revalidating]);
};

/** 검색어가 멈춘 뒤에만 조회하고, 떠났다 돌아오면 담아 둔 결과에서 잇는다. */
export const useProductSuggestions = (keyword: string) => {
  const trimmed = keyword.trim();
  const debounced = useDebouncedValue(trimmed);
  const [state, setState] = useState<State>(() => initial(debounced));

  // 검색어가 바뀌면 렌더링 중에 결과를 갈아 끼운다. effect 에서 비우면 한 번 더 그린다.
  const current = state.keyword === debounced ? state : initial(debounced);
  if (state.keyword !== debounced) setState(current);

  useFetchPage(debounced, current, setState);
  useRevalidate(debounced, current, setState);
  useRememberPages(debounced, current);
  useRestoreScroll(debounced, current);

  const loadNext = useCallback(() => {
    setState((previous) => ({ ...previous, page: previous.page + 1, pendingPage: previous.page + 1, loading: true }));
  }, []);

  return { ...current, keyword: debounced, loading: current.loading || trimmed !== debounced, loadNext };
};
