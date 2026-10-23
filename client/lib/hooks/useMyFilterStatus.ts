"use client";

import { useEffect, useState } from "react";

import { isSignedOut } from "@/lib/api/member";
import { fetchMyFilter } from "@/lib/api/my-filter";

/**
 * 나만의 필터를 켜고 끄는 자리(S22 행, S23 칩)가 알아야 하는 회원 상태.
 * 관리자 세션과 읽기 실패는 켤 수 없는 상태라 함께 unavailable 로 둔다. 두 자리 모두 이때는 숨긴다.
 */
export type MyFilterStatus =
  | { readonly status: "loading" }
  | { readonly status: "signedOut" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly count: number };

export const LOADING_MY_FILTER: MyFilterStatus = { status: "loading" };

const statusOfError = (error: unknown): MyFilterStatus =>
  isSignedOut(error) ? { status: "signedOut" } : { status: "unavailable" };

/** 나만의 필터를 한 번 읽어 로그인 여부와 성분 수를 알린다. */
export const useMyFilterStatus = (): MyFilterStatus => {
  const [status, setStatus] = useState<MyFilterStatus>(LOADING_MY_FILTER);

  useEffect(() => {
    let active = true;
    fetchMyFilter().then(
      (filter) => {
        if (active) setStatus({ status: "ready", count: filter.items.length });
      },
      (error: unknown) => {
        if (active) setStatus(statusOfError(error));
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return status;
};

/** 결과에 실제로 적용되는지. 주소에 켜져 있어도 로그인 전이거나 필터가 비었으면 서버가 무시하므로 끈 모양으로 둔다. */
export const myFilterApplied = (requested: boolean, status: MyFilterStatus): boolean =>
  requested && status.status === "ready" && status.count > 0;
