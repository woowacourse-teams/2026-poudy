"use client";

import type { RoutineResponse, RoutinesResponse, SharedRoutineResponse } from "@poudy/api/api.zod";
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
export const useMyRoutines = () => useLoad<RoutinesResponse>(fetchMyRoutines);

/** 내 루틴 하나. 고친 결과는 서버가 돌려준 루틴으로 바로 바꾼다. */
export const useMyRoutine = (routineId: number) => {
  const load = useCallback(() => fetchMyRoutine(routineId), [routineId]);
  const { state, retry, setState } = useLoad<RoutineResponse>(load);
  const replace = useCallback((routine: RoutineResponse) => setState({ status: "ready", data: routine }), [setState]);
  return { state, retry, replace };
};

/** 공개 루틴 하나. 로그인하지 않아도 읽는다. */
export const useSharedRoutine = (routineId: number) => {
  const load = useCallback(() => fetchSharedRoutine(routineId), [routineId]);
  const { state, retry } = useLoad<SharedRoutineResponse>(load);
  return { state, retry };
};
