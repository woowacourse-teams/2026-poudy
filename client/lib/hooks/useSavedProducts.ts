"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useState } from "react";

import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { fetchSavedProducts } from "@/lib/api/saved-products";

export type SavedProductsStatus = "loading" | "ready" | "error" | "signedOut" | "adminSession";

type SavedProductsState = {
  /** 몇 번째로 불러오는지. [다시 시도] 전에 보낸 요청이 늦게 와도 버린다. */
  readonly key: string;
  readonly status: SavedProductsStatus;
  readonly items: readonly ProductResponse[];
};

const loadingState = (key: string): SavedProductsState => ({ key, status: "loading", items: [] });

const failureState = (key: string, error: unknown): SavedProductsState => {
  if (isSignedOut(error)) return { ...loadingState(key), status: "signedOut" };
  if (isAdminSession(error)) return { ...loadingState(key), status: "adminSession" };
  return { ...loadingState(key), status: "error" };
};

/** 응답이 늦게 와도 그사이 다시 불러오기 시작했으면 버린다. */
const whenStill =
  (next: SavedProductsState) =>
  (previous: SavedProductsState): SavedProductsState => {
    if (previous.key !== next.key) return previous;
    return next;
  };

/** 위시리스트를 최근 담은 순으로 서버에서 한 번에 받는다. */
export const useSavedProducts = () => {
  const [attempt, setAttempt] = useState(0);
  const key = String(attempt);
  const [state, setState] = useState<SavedProductsState>(() => loadingState(key));
  if (state.key !== key) setState(loadingState(key));

  useEffect(() => {
    fetchSavedProducts()
      .then((response) => setState(whenStill({ key, status: "ready", items: response.items })))
      .catch((error: unknown) => setState(whenStill(failureState(key, error))));
  }, [key]);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);

  return { status: state.status, items: state.items, retry };
};
