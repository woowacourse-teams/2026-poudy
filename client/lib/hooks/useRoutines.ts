"use client";

import type { RoutineResponse, SharedRoutineDetailResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useState } from "react";

import { useRoutinePages } from "./useRoutinePages";

import { ApiError } from "@/lib/api/client";
import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { fetchMyRoutine, fetchMyRoutines, fetchSharedRoutine } from "@/lib/api/routine";
import { myRoutinePages } from "@/lib/storage/routine-pages-cache";

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

const loadMyPage = async (page: number) => {
  const result = await fetchMyRoutines(page);
  return { items: result.items, page, total: result.pagination.totalElements, hasNext: result.pagination.hasNext };
};

/** 개인 항목은 캐시에 남기지 않고, 돌아올 때 불러왔던 장수만큼 다시 조회한다. */
export const useMyRoutines = ({ remember = true }: { readonly remember?: boolean } = {}) =>
  useRoutinePages({ path: "/routines/my", loadPage: loadMyPage, cache: myRoutinePages, remember, reuseItems: false });

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
