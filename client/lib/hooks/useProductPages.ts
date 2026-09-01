"use client";

import type { BrandResponse, ProductPageResponse, ProductResponse } from "@poudy/api/api.zod";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

import { fetchProducts } from "@/lib/api/products";
import type { Filter } from "@/lib/domain/filter";

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
});

const useFetchPage = (key: string, page: number, setState: SetPageState) => {
  useEffect(() => {
    const controller = new AbortController();
    const keep = (update: (previous: PageState) => PageState) => {
      if (controller.signal.aborted) return;
      setState((previous) => (previous.key === key ? update(previous) : previous));
    };

    fetchProducts({ ...JSON.parse(key), page })
      .then((response) => keep((previous) => merged(previous, page, response)))
      .catch(() => keep((previous) => ({ ...previous, loading: false })));

    return () => controller.abort();
  }, [key, page, setState]);
};

/** 조건이 바뀌면 목록을 처음부터 다시 쌓는다. */
export const useProductPages = (filter: Filter) => {
  const key = JSON.stringify({ ...filter, page: 0 });
  const [state, setState] = useState<PageState>({ ...EMPTY_PAGE_STATE, key });

  // 조건이 바뀌면 렌더링 중에 목록을 비운다. effect 에서 되돌리면 한 번 더 그리게 된다.
  const current = state.key === key ? state : { ...EMPTY_PAGE_STATE, key };
  if (state.key !== key) setState(current);

  useFetchPage(key, current.page, setState);

  const loadNext = useCallback(() => {
    setState((previous) => ({ ...previous, page: previous.page + 1, loading: true }));
  }, []);

  return { ...current, loadNext };
};
