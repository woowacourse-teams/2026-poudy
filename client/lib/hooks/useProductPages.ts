"use client";

import type {
  BrandResponse,
  CategoryResponse,
  ProductPageResponse,
  ProductResponse,
  SkinTypeResponse,
} from "@poudy/api/api.zod";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { fetchProducts } from "@/lib/api/products";
import { FIRST_PAGE, type Filter } from "@/lib/domain/filter";
import { applyScrollPosition, readScrollPosition } from "@/lib/navigation/scroll-anchor";
import { STALE_MS } from "@/lib/storage/list-cache";
import {
  productPagesKey,
  readProductPages,
  rememberScrollPosition,
  writeProductPages,
} from "@/lib/storage/product-pages-cache";

type PageState = {
  readonly key: string;
  /** 목록이 시작한 장. 주소의 `?page=N` 으로 들어오면 첫 장이 아닐 수 있다. */
  readonly first: number;
  /** 지금까지 받은 가장 마지막 장. */
  readonly page: number;
  readonly items: readonly ProductResponse[];
  /** 지금 조건에 걸린 제품 전체의 브랜드. 페이지에 걸리지 않는다. */
  readonly brands: readonly BrandResponse[];
  /** 브랜드와 같다. 지금 조건에 걸린 제품 전체의 카테고리다. */
  readonly categories: readonly CategoryResponse[];
  /** 브랜드와 같다. 지금 조건에 걸린 제품 전체가 드는 피부 타입이다. */
  readonly skinTypes: readonly SkinTypeResponse[];
  readonly total: number;
  readonly hasNext: boolean;
  readonly loading: boolean;
  /** 현재 조건의 API 응답을 성공적으로 받은 적이 있는지. 실패를 0건으로 기록하지 않는다. */
  readonly loaded: boolean;
  /**
   * 마지막 요청이 실패했는지. 실패한 장을 없는 장처럼 보여 주지 않고, 저절로 다시 부르지도 않는다.
   * 다시 부르는 것은 사람이 누를 때뿐이다. 장애 중에 스크롤이 API 를 거듭 두드리지 않는다.
   */
  readonly failed: boolean;
  /** 아직 받아 오지 않은 장. 없으면 받을 것이 없다. */
  readonly pendingPage?: number;
  /** 위에 붙일 앞쪽 장. 중간 장부터 들어온 사람이 앞으로 돌아갈 때 받는다. */
  readonly pendingPreviousPage?: number;
  /** 캐시에서 되살렸는지. 보던 자리로 되돌릴 대상인지 가른다. */
  readonly restored: boolean;
  /** 되살린 장 전체를 다시 받는 중인지. 그동안에도 담아 둔 목록을 보여 준다. */
  readonly revalidating: boolean;
};

type SetPageState = Dispatch<SetStateAction<PageState>>;

/** 서버가 그려 보낸 첫 장. 어느 조건의 결과인지 함께 들고 온다. */
export type InitialPage = {
  readonly key: string;
  readonly response: ProductPageResponse;
};

const EMPTY_PAGE_STATE: Omit<PageState, "key" | "first" | "page" | "pendingPage"> = {
  items: [],
  brands: [],
  categories: [],
  skinTypes: [],
  total: 0,
  hasNext: false,
  loading: true,
  loaded: false,
  failed: false,
  restored: false,
  revalidating: false,
};

/**
 * 담아 둔 조건이면 이어 붙인 목록을 통째로 되살린다.
 * 첫 그리기부터 문서 높이가 살아 있어야 보던 자리로 되돌릴 수 있다.
 */
const initialState = (key: string, first: number, seed?: ProductPageResponse): PageState => {
  const cached = readProductPages(key);
  if (!cached) {
    const empty = { ...EMPTY_PAGE_STATE, key, first, page: first, pendingPage: first };
    // 서버가 첫 장을 그려 보냈으면 그것으로 시작한다. 같은 장을 다시 받지 않는다.
    if (seed) return { ...merged(empty, first, seed), restored: false, revalidating: false };
    return empty;
  }

  const { page, items, brands, categories, skinTypes, total, hasNext, fetchedAt } = cached;
  return {
    key,
    // 앞쪽 장을 붙였으면 주소의 장보다 앞에서 시작한다.
    first: cached.first,
    page,
    items,
    brands,
    categories,
    skinTypes,
    total,
    hasNext,
    loading: false,
    loaded: true,
    failed: false,
    pendingPage: undefined,
    restored: true,
    revalidating: Date.now() - fetchedAt > STALE_MS,
  };
};

/** 시작한 장은 갈아 끼우고 다음 장은 이어 붙인다. 받은 뒤에야 마지막 장을 옮긴다. */
const merged = (previous: PageState, page: number, response: ProductPageResponse): PageState => ({
  ...previous,
  page,
  items: page === previous.first ? response.items : [...previous.items, ...response.items],
  // 조건이 같으면 장마다 같은 값이 온다. 첫 장의 것을 그대로 쓴다.
  brands: response.brands,
  categories: response.categories,
  skinTypes: response.skinTypes,
  total: response.pagination.totalElements,
  hasNext: response.pagination.hasNext,
  loading: false,
  loaded: true,
  failed: false,
  pendingPage: undefined,
});

/** 앞쪽 장은 위에 붙인다. 뒤쪽 끝과 다음 장 여부는 그대로다. */
const prepended = (previous: PageState, page: number, response: ProductPageResponse): PageState => ({
  ...previous,
  first: page,
  items: [...response.items, ...previous.items],
  total: response.pagination.totalElements,
  pendingPreviousPage: undefined,
});

const useFetchPreviousPage = (key: string, state: PageState, setState: SetPageState) => {
  const { pendingPreviousPage } = state;

  useEffect(() => {
    if (pendingPreviousPage === undefined) return;

    const controller = new AbortController();
    const keep = (update: (previous: PageState) => PageState) => {
      if (controller.signal.aborted) return;
      setState((previous) => (previous.key === key ? update(previous) : previous));
    };

    fetchProducts({ ...JSON.parse(key), page: pendingPreviousPage })
      .then((response) => keep((previous) => prepended(previous, pendingPreviousPage, response)))
      .catch(() => keep((previous) => ({ ...previous, pendingPreviousPage: undefined })));

    return () => controller.abort();
  }, [key, pendingPreviousPage, setState]);
};

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
      .catch(() => keep((previous) => ({ ...previous, loading: false, failed: true, pendingPage: undefined })));

    return () => controller.abort();
  }, [key, pendingPage, setState]);
};

/** 쌓아 둔 장을 전부 다시 받는다. 첫 장만 받으면 이어 붙인 목록이 스무 건으로 덮인다. */
const refetchPages = async (key: string, first: number, lastPage: number): Promise<readonly ProductPageResponse[]> => {
  const filter = JSON.parse(key);
  return Promise.all(
    Array.from({ length: lastPage - first + 1 }, (_, index) => fetchProducts({ ...filter, page: first + index })),
  );
};

const revalidated = (previous: PageState, responses: readonly ProductPageResponse[]): PageState => {
  const last = responses[responses.length - 1];
  return {
    ...previous,
    items: responses.flatMap((response) => response.items),
    brands: responses[0].brands,
    categories: responses[0].categories,
    skinTypes: responses[0].skinTypes,
    total: last.pagination.totalElements,
    hasNext: last.pagination.hasNext,
    revalidating: false,
  };
};

/** 오래된 목록만 다시 받는다. 받는 동안에도 담아 둔 목록을 그대로 보여 준다. */
const useRevalidate = (key: string, state: PageState, setState: SetPageState) => {
  const { revalidating, first, page } = state;

  useEffect(() => {
    if (!revalidating) return;

    const controller = new AbortController();
    const keep = (update: (previous: PageState) => PageState) => {
      if (controller.signal.aborted) return;
      setState((previous) => (previous.key === key ? update(previous) : previous));
    };

    refetchPages(key, first, page)
      .then((responses) => keep((previous) => revalidated(previous, responses)))
      .catch(() => keep((previous) => ({ ...previous, revalidating: false })));

    return () => controller.abort();
  }, [key, revalidating, first, page, setState]);
};

/**
 * 장이 늘 때마다 담아 둔다. 보던 자리는 상태를 바꾸지 않으므로 따로 적어 둔다.
 */
const useRememberPages = (key: string, state: PageState) => {
  const { loaded, loading, revalidating, first, page, items, brands, categories, skinTypes, total, hasNext } = state;

  useEffect(() => {
    if (!loaded || loading || revalidating) return;
    writeProductPages(key, { first, page, items, brands, categories, skinTypes, total, hasNext });
  }, [key, loaded, loading, revalidating, first, page, items, brands, categories, skinTypes, total, hasNext]);

  /*
   * 보던 자리는 떠나는 순간에만 잰다. 담아 둔 값은 돌아올 때 한 번 읽히는데, 스크롤마다
   * 다시 재면 프레임마다 hit-test 를 돌리게 된다(160건 목록에서 스크롤 이벤트당 108µs 이고
   * 항목 수에 비례해 자란다). 여기서는 화면을 떠날 때 한 번만 잰다.
   *
   * 지우는 트리의 layout effect 정리는 DOM 을 떼어내기 전에 돌아, 이 자리에서 항목의
   * 자리를 아직 잴 수 있다. 캐시는 메모리에 있어 새로고침하면 사라지므로, 되돌릴 자리가
   * 필요한 경우는 화면을 옮겨 다니다 돌아오는 길뿐이다.
   */
  useLayoutEffect(() => () => rememberScrollPosition(key, readScrollPosition), [key]);
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

const seedFor = (initial: InitialPage | undefined, key: string): ProductPageResponse | undefined => {
  if (initial?.key !== key) return undefined;
  return initial.response;
};

/**
 * 조건이 바뀌면 목록을 처음부터 다시 쌓고, 떠났다 돌아오면 담아 둔 목록에서 잇는다.
 * 조건의 `page` 는 목록이 시작할 장이다. 그 뒤로는 주소를 바꾸지 않고 장을 이어 붙인다.
 */
export const useProductPages = (filter: Filter, initial?: InitialPage) => {
  const key = productPagesKey(filter);
  // 서버가 본 조건과 지금 조건이 같을 때만 쓴다. 조건이 바뀌면 씨앗은 버린다.
  const seed = seedFor(initial, key);
  const [state, setState] = useState<PageState>(() => initialState(key, filter.page, seed));

  // 조건이 바뀌면 렌더링 중에 목록을 갈아 끼운다. effect 에서 되돌리면 한 번 더 그리게 된다.
  const current = state.key === key ? state : initialState(key, filter.page, seed);
  if (state.key !== key) setState(current);

  useFetchPage(key, current, setState);
  useFetchPreviousPage(key, current, setState);
  useRevalidate(key, current, setState);
  useRememberPages(key, current);
  useRestoreScroll(key, current);

  const loadNext = useCallback(() => {
    setState((previous) => ({ ...previous, pendingPage: previous.page + 1, loading: true, failed: false }));
  }, []);

  /** 실패한 요청을 다시 보낸다. 첫 장부터 실패했으면 시작한 장을, 아니면 다음 장을 부른다. */
  const retry = useCallback(() => {
    setState((previous) => {
      if (!previous.failed) return previous;
      const pendingPage = previous.loaded ? previous.page + 1 : previous.first;
      return { ...previous, pendingPage, loading: true, failed: false };
    });
  }, []);

  const loadPrevious = useCallback(() => {
    setState((previous) => {
      if (previous.first <= FIRST_PAGE || previous.pendingPreviousPage !== undefined) return previous;
      return { ...previous, pendingPreviousPage: previous.first - 1 };
    });
  }, []);

  return { ...current, loadingPrevious: current.pendingPreviousPage !== undefined, loadNext, loadPrevious, retry };
};
