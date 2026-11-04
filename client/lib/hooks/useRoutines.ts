"use client";

import type {
  RoutinePageResponse,
  RoutineResponse,
  RoutineSummaryResponse,
  SharedRoutineDetailResponse,
} from "@poudy/api/api.zod";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { fetchMyRoutine, fetchMyRoutines, fetchSharedRoutine } from "@/lib/api/routine";

export type LoadState<T> =
  | { readonly status: "loading" }
  | { readonly status: "signedOut" }
  | { readonly status: "adminSession" }
  | { readonly status: "notFound" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly data: T };

const stateOfError = <T>(error: unknown): LoadState<T> => {
  if (isSignedOut(error)) return { status: "signedOut" };
  if (isAdminSession(error)) return { status: "adminSession" };
  if (error instanceof ApiError && error.code === "ROUTINE_NOT_FOUND") return { status: "notFound" };
  return { status: "error" };
};

const useLoad = <T>(load: () => Promise<T>) => {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  const reload = useCallback(
    () =>
      load().then(
        (data) => setState({ status: "ready", data }),
        (error: unknown) => setState(stateOfError<T>(error)),
      ),
    [load],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  /** 실패한 뒤 다시 읽는다. 다시 읽는 동안은 불러오는 중으로 돌린다. */
  const retry = useCallback(() => {
    setState({ status: "loading" });
    reload();
  }, [reload]);

  return { state, reload, retry, setState };
};

/** 내 루틴 목록. 로그인하지 않았으면 signedOut 이다. */
export type RoutineList = {
  readonly items: readonly RoutineSummaryResponse[];
  readonly page: number;
  readonly total: number;
  readonly hasNext: boolean;
  readonly loadingMore: boolean;
  readonly moreFailed: boolean;
};

const firstRoutineList = (first: RoutinePageResponse): RoutineList => ({
  items: first.items,
  page: 1,
  total: first.pagination.totalElements,
  hasNext: first.pagination.hasNext,
  loadingMore: false,
  moreFailed: false,
});

const loadFirstRoutines = async (): Promise<RoutineList> => firstRoutineList(await fetchMyRoutines(1));

export const useMyRoutines = () => {
  const { state, retry, setState } = useLoad<RoutineList>(loadFirstRoutines);

  /** 다음 쪽을 붙인다. 보는 사이 루틴이 늘어 쪽이 밀리면 이미 받은 루틴이 다시 오므로 겹친 것은 뺀다. */
  const loadMore = useCallback(async () => {
    if (state.status !== "ready") return;
    const list = state.data;
    setState({ status: "ready", data: { ...list, loadingMore: true } });
    try {
      const next = await fetchMyRoutines(list.page + 1);
      const seen = new Set(list.items.map((routine) => routine.id));
      setState({
        status: "ready",
        data: {
          items: [...list.items, ...next.items.filter((routine) => !seen.has(routine.id))],
          page: list.page + 1,
          total: next.pagination.totalElements,
          hasNext: next.pagination.hasNext,
          loadingMore: false,
          moreFailed: false,
        },
      });
    } catch {
      setState({ status: "ready", data: { ...list, loadingMore: false, moreFailed: true } });
    }
  }, [state, setState]);

  return { state, retry, loadMore };
};

/** 내 루틴 하나. 고친 결과는 서버가 돌려준 루틴으로 바로 바꾼다. */
export const useMyRoutine = (routineId: number, { reportErrors = true }: { readonly reportErrors?: boolean } = {}) => {
  const load = useCallback(() => fetchMyRoutine(routineId, { reportErrors }), [routineId, reportErrors]);
  const { state, retry, setState } = useLoad<RoutineResponse>(load);
  const replace = useCallback((routine: RoutineResponse) => setState({ status: "ready", data: routine }), [setState]);
  return { state, retry, replace };
};

/** 공개 루틴 하나. 로그인하지 않아도 읽는다. */
export const useSharedRoutine = (routineId: number) => {
  const load = useCallback(() => fetchSharedRoutine(routineId), [routineId]);
  const { state, retry, reload } = useLoad<SharedRoutineDetailResponse>(load);
  return { state, retry, reload };
};
