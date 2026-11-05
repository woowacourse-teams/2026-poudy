"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { currentHistoryEntry } from "@/lib/navigation/history-entry";
import { applyScrollPosition, readScrollPosition } from "@/lib/navigation/scroll-anchor";
import { type Cached, type createListCache, restorablePosition } from "@/lib/storage/list-cache";
import type { RoutinePages } from "@/lib/storage/routine-pages-cache";

export type RoutineList<T> = RoutinePages<T> & { readonly loadingMore: boolean; readonly moreFailed: boolean };
export type RoutineListState<T> =
  | { readonly status: "loading" | "error" | "signedOut" | "adminSession" }
  | { readonly status: "ready"; readonly data: RoutineList<T>; readonly revalidating: boolean };
type Item = { readonly id: number };
type Options<T> = {
  readonly path: string;
  readonly loadPage: (page: number) => Promise<RoutinePages<T>>;
  readonly cache: ReturnType<typeof createListCache<RoutinePages<T>>>;
  readonly remember?: boolean;
  readonly reuseItems?: boolean;
};
type Visit<T> = { readonly key: string; readonly entry?: string; readonly cached?: Cached<RoutinePages<T>> };
type Request<T> = {
  readonly state: RoutineListState<T>;
  readonly setState: (state: RoutineListState<T>) => void;
  readonly epoch: RefObject<number>;
};
const listOf = <T>(page: RoutinePages<T>): RoutineList<T> => ({ ...page, loadingMore: false, moreFailed: false });
const appended = <T extends Item>(before: readonly T[], next: readonly T[]): readonly T[] => {
  const seen = new Set(before.map((item) => item.id));
  return [...before, ...next.filter((item) => !seen.has(item.id))];
};
/** 돌아올 문서 높이를 되살리려면 떠날 때까지 받은 장을 모두 채워야 한다. */
const loadPages = async <T extends Item>(
  loadPage: Options<T>["loadPage"],
  lastPage: number,
  active: () => boolean,
): Promise<RoutinePages<T>> => {
  let result = await loadPage(1);
  for (let page = 2; page <= lastPage && result.hasNext && active(); page += 1) {
    const next = await loadPage(page);
    result = { ...next, items: appended(result.items, next.items) };
  }
  return result;
};
const readRoutinePosition = () => {
  const bottom = document.querySelector("[data-routine-tabs]")?.getBoundingClientRect().bottom ?? 0;
  return readScrollPosition(Math.max(0, Math.ceil(bottom)));
};
const readVisit = <T>({ path, cache, remember = true }: Options<T>, entry?: string): Visit<T> => {
  const key = `${path}:${entry ?? "legacy"}`;
  const cached = remember ? cache.read(key) : undefined;
  return { key, entry, cached: restorablePosition(cached) ? cached : undefined };
};
const failedState = <T>(
  error: unknown,
  cache: Options<T>["cache"],
  fallback?: RoutinePages<T>,
): RoutineListState<T> => {
  if (fallback) return { status: "ready", data: listOf(fallback), revalidating: false };
  if (isSignedOut(error) || isAdminSession(error)) {
    cache.clear();
    return { status: isSignedOut(error) ? "signedOut" : "adminSession" };
  }
  return { status: "error" };
};
const initialState = <T>(cached: RoutinePages<T> | undefined, reuseItems: boolean): RoutineListState<T> =>
  cached && reuseItems ? { status: "ready", data: listOf(cached), revalidating: true } : { status: "loading" };

const subscribeToHistory = (changed: () => void) => {
  window.addEventListener("popstate", changed);
  return () => window.removeEventListener("popstate", changed);
};
const serverEntry = () => undefined;
/** 외부 방문 기록은 커밋 때 다시 확인하므로 렌더 도중 라우터가 갱신해도 이전 항목을 저장하지 않는다. */
const useVisit = <T>({ path, cache, remember = true, loadPage }: Options<T>) => {
  const entry = useSyncExternalStore(subscribeToHistory, currentHistoryEntry, serverEntry);
  return useMemo(() => readVisit({ path, cache, remember, loadPage }, entry), [cache, entry, loadPage, path, remember]);
};
const useRoutineState = <T>(visit: Visit<T>, reuseItems: boolean) => {
  const [result, setResult] = useState<{ readonly visit: Visit<T>; readonly state: RoutineListState<T> }>();
  const state = result?.visit === visit ? result.state : initialState(visit.cached, reuseItems);
  const setState = useCallback((next: RoutineListState<T>) => setResult({ visit, state: next }), [visit]);
  return { state, setState };
};
const usePageRequest = <T extends Item>(options: Options<T>, visit: Visit<T>) => {
  const { loadPage, cache, reuseItems = true } = options;
  const { state, setState } = useRoutineState(visit, reuseItems);
  const [attempt, setAttempt] = useState(0);
  const epoch = useRef(0);
  useEffect(() => {
    let active = true;
    epoch.current += 1;
    loadPages(loadPage, visit.cached?.page ?? 1, () => active).then(
      (page) => {
        if (active) setState({ status: "ready", data: listOf(page), revalidating: false });
      },
      (error: unknown) => {
        if (active) setState(failedState(error, cache, reuseItems ? visit.cached : undefined));
      },
    );
    return () => {
      active = false;
      epoch.current += 1;
    };
  }, [attempt, cache, loadPage, reuseItems, setState, visit]);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, [setState]);
  return { state, setState, epoch, retry };
};
const useNextPage = <T extends Item>(loadPage: Options<T>["loadPage"], { state, setState, epoch }: Request<T>) => {
  const pending = useRef(false);
  return useCallback(async () => {
    if (state.status !== "ready" || state.revalidating || !state.data.hasNext || pending.current) return;
    pending.current = true;
    const request = epoch.current;
    const list = state.data;
    setState({ ...state, data: { ...list, loadingMore: true, moreFailed: false } });
    try {
      const next = await loadPage(list.page + 1);
      if (request === epoch.current)
        setState({
          status: "ready",
          revalidating: false,
          data: listOf({ ...next, items: appended(list.items, next.items) }),
        });
    } catch {
      if (request === epoch.current) setState({ ...state, data: { ...list, loadingMore: false, moreFailed: true } });
    } finally {
      pending.current = false;
    }
  }, [epoch, loadPage, setState, state]);
};
const useRememberPages = <T>(options: Options<T>, visit: Visit<T> | undefined, state: RoutineListState<T>) => {
  const { cache, remember = true, reuseItems = true } = options;
  const captured = useRef(false);
  const rememberPosition = useCallback(() => {
    if (!remember || !visit) return;
    cache.rememberPosition(visit.key, readRoutinePosition, visit.entry);
    captured.current = true;
  }, [cache, remember, visit]);
  useEffect(() => {
    if (!remember || !visit || state.status !== "ready" || state.revalidating || state.data.loadingMore) return;
    const { items, page, total, hasNext } = state.data;
    cache.write(visit.key, { items: reuseItems ? items : [], page, total, hasNext });
  }, [cache, remember, reuseItems, state, visit]);
  useLayoutEffect(() => {
    captured.current = false;
    return () => {
      if (!captured.current) rememberPosition();
    };
  }, [rememberPosition]);
  return rememberPosition;
};
const useRestorePosition = <T>(visit: Visit<T> | undefined, state: RoutineListState<T>, remember: boolean) => {
  const restored = useRef(false);
  const previousVisit = useRef<Visit<T>>(undefined);
  const landed = useRef<number>(undefined);
  useLayoutEffect(() => {
    if (previousVisit.current !== visit) {
      previousVisit.current = visit;
      restored.current = false;
      landed.current = undefined;
    }
    if (!visit || !remember || restored.current) return;
    if (!visit.cached) {
      window.scrollTo(0, 0);
      restored.current = true;
      return;
    }
    if (state.status !== "ready") return;
    // 갱신을 기다리는 동안 사용자가 옮긴 위치는 덮어쓰지 않는다.
    if (landed.current !== undefined && window.scrollY !== landed.current) {
      restored.current = true;
      return;
    }
    applyScrollPosition(visit.cached.position);
    landed.current = window.scrollY;
    restored.current = !state.revalidating;
  }, [remember, state, visit]);
};
/** 목록과 위치는 같은 방문 기록으로 돌아올 때만 복원한다. 새 링크는 첫 장부터 시작한다. */
export const useRoutinePages = <T extends Item>(options: Options<T>) => {
  const { loadPage, remember = true } = options;
  const visit = useVisit(options);
  const request = usePageRequest(options, visit);
  const loadMore = useNextPage(loadPage, request);
  const rememberPosition = useRememberPages(options, visit, request.state);
  useRestorePosition(visit, request.state, remember);
  return { state: request.state, retry: request.retry, loadMore, rememberPosition };
};
