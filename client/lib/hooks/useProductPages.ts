"use client";

import type { BrandResponse, ProductPageResponse, ProductResponse } from "@poudy/api/api.zod";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { fetchProducts } from "@/lib/api/products";
import type { Filter } from "@/lib/domain/filter";
import { applyScrollPosition, readScrollPosition } from "@/lib/navigation/scroll-anchor";
import { STALE_MS } from "@/lib/storage/list-cache";
import { readProductPages, rememberScrollPosition, writeProductPages } from "@/lib/storage/product-pages-cache";

type PageState = {
  readonly key: string;
  readonly page: number;
  readonly items: readonly ProductResponse[];
  /** 지금 조건에 걸린 제품 전체의 브랜드. 페이지에 걸리지 않는다. */
  readonly brands: readonly BrandResponse[];
  readonly total: number;
  readonly hasNext: boolean;
  readonly loading: boolean;
  /** 현재 조건의 API 응답을 성공적으로 받은 적이 있는지. 실패를 0건으로 기록하지 않는다. */
  readonly loaded: boolean;
  /** 아직 받아 오지 않은 장. 없으면 받을 것이 없다. */
  readonly pendingPage?: number;
  /** 캐시에서 되살렸는지. 보던 자리로 되돌릴 대상인지 가른다. */
  readonly restored: boolean;
  /** 되살린 장 전체를 다시 받는 중인지. 그동안에도 담아 둔 목록을 보여 준다. */
  readonly revalidating: boolean;
};

type SetPageState = Dispatch<SetStateAction<PageState>>;

const EMPTY_PAGE_STATE: Omit<PageState, "key"> = {
  page: 0,
  items: [],
  brands: [],
  total: 0,
  hasNext: false,
  loading: true,
  loaded: false,
  pendingPage: 0,
  restored: false,
  revalidating: false,
};

/**
 * 담아 둔 조건이면 이어 붙인 목록을 통째로 되살린다.
 * 첫 그리기부터 문서 높이가 살아 있어야 보던 자리로 되돌릴 수 있다.
 */
const initialState = (key: string): PageState => {
  const cached = readProductPages(key);
  if (!cached) return { ...EMPTY_PAGE_STATE, key };

  const { page, items, brands, total, hasNext, fetchedAt } = cached;
  return {
    key,
    page,
    items,
    brands,
    total,
    hasNext,
    loading: false,
    loaded: true,
    pendingPage: undefined,
    restored: true,
    revalidating: Date.now() - fetchedAt > STALE_MS,
  };
};

/** 첫 페이지는 갈아 끼우고 다음 페이지는 이어 붙인다. */
const merged = (previous: PageState, page: number, response: ProductPageResponse): PageState => ({
  ...previous,
  items: page === 0 ? response.items : [...previous.items, ...response.items],
  // 조건이 같으면 장마다 같은 값이 온다. 첫 장의 것을 그대로 쓴다.
  brands: response.brands,
  total: response.pagination.totalElements,
  hasNext: response.pagination.hasNext,
  loading: false,
  loaded: true,
  pendingPage: undefined,
});

const useFetchPage = (key: string, state: PageState, setState: SetPageState) => {
  const { pendingPage } = state;

  useEffect(() => {
    if (pendingPage === undefined) return;

    const controller = new AbortController();
    const keep = (update: (previous: PageState) => PageState) => {
      if (controller.signal.aborted) return;
      setState((previous) => (previous.key === key ? update(previous) : previous));
    };

    fetchProducts({ ...JSON.parse(key), page: pendingPage })
      .then((response) => keep((previous) => merged(previous, pendingPage, response)))
      .catch(() => keep((previous) => ({ ...previous, loading: false, pendingPage: undefined })));

    return () => controller.abort();
  }, [key, pendingPage, setState]);
};

/** 쌓아 둔 장을 전부 다시 받는다. 첫 장만 받으면 이어 붙인 목록이 스무 건으로 덮인다. */
const refetchPages = async (key: string, lastPage: number): Promise<readonly ProductPageResponse[]> => {
  const filter = JSON.parse(key);
  return Promise.all(Array.from({ length: lastPage + 1 }, (_, page) => fetchProducts({ ...filter, page })));
};

const revalidated = (previous: PageState, responses: readonly ProductPageResponse[]): PageState => {
  const last = responses[responses.length - 1];
  return {
    ...previous,
    items: responses.flatMap((response) => response.items),
    brands: responses[0].brands,
    total: last.pagination.totalElements,
    hasNext: last.pagination.hasNext,
    revalidating: false,
  };
};

/** 오래된 목록만 다시 받는다. 받는 동안에도 담아 둔 목록을 그대로 보여 준다. */
const useRevalidate = (key: string, state: PageState, setState: SetPageState) => {
  const { revalidating, page } = state;

  useEffect(() => {
    if (!revalidating) return;

    const controller = new AbortController();
    const keep = (update: (previous: PageState) => PageState) => {
      if (controller.signal.aborted) return;
      setState((previous) => (previous.key === key ? update(previous) : previous));
    };

    refetchPages(key, page)
      .then((responses) => keep((previous) => revalidated(previous, responses)))
      .catch(() => keep((previous) => ({ ...previous, revalidating: false })));

    return () => controller.abort();
  }, [key, revalidating, page, setState]);
};

/**
 * 장이 늘 때마다 담아 둔다. 떠나는 순간에만 담으면 그 시점의 상태를 붙잡기 어렵다.
 * 보던 자리는 상태를 바꾸지 않으므로 따로 적어 둔다.
 */
const useRememberPages = (key: string, state: PageState) => {
  const { loaded, loading, revalidating, page, items, brands, total, hasNext } = state;

  useEffect(() => {
    if (!loaded || loading || revalidating) return;
    writeProductPages(key, { page, items, brands, total, hasNext });
  }, [key, loaded, loading, revalidating, page, items, brands, total, hasNext]);

  useEffect(() => {
    const onScroll = () => rememberScrollPosition(key, readScrollPosition());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key]);
};

/**
 * 되살린 목록이 그려진 뒤에 보던 자리로 되돌린다. 다시 받아 온 목록으로 갈아 끼우면
 * 항목 위쪽 높이가 달라질 수 있어 한 번 더 맞춘다. 그사이 사용자가 스크롤했으면 두지 않는다.
 */
const useRestoreScroll = (key: string, state: PageState) => {
  const applied = useRef<string>(undefined);
  const landed = useRef(0);

  useLayoutEffect(() => {
    if (!state.restored) return;
    if (applied.current === key && window.scrollY !== landed.current) return;

    applied.current = key;
    const position = readProductPages(key)?.position;
    if (!position) return;

    applyScrollPosition(position);
    landed.current = window.scrollY;
  }, [key, state.restored, state.revalidating]);
};

/** 조건이 바뀌면 목록을 처음부터 다시 쌓고, 떠났다 돌아오면 담아 둔 목록에서 잇는다. */
export const useProductPages = (filter: Filter) => {
  const key = JSON.stringify({ ...filter, page: 0 });
  const [state, setState] = useState<PageState>(() => initialState(key));

  // 조건이 바뀌면 렌더링 중에 목록을 갈아 끼운다. effect 에서 되돌리면 한 번 더 그리게 된다.
  const current = state.key === key ? state : initialState(key);
  if (state.key !== key) setState(current);

  useFetchPage(key, current, setState);
  useRevalidate(key, current, setState);
  useRememberPages(key, current);
  useRestoreScroll(key, current);

  const loadNext = useCallback(() => {
    setState((previous) => ({ ...previous, page: previous.page + 1, pendingPage: previous.page + 1, loading: true }));
  }, []);

  return { ...current, loadNext };
};
