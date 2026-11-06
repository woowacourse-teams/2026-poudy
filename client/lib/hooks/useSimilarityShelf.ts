"use client";

import type { ShelfResponse } from "@poudy/api/api.zod";
import { useCallback, useEffect, useRef, useState } from "react";

import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { fetchShelf } from "@/lib/api/shelf";

type State =
  | { readonly status: "loading" | "signedOut" | "adminSession" | "error" }
  | { readonly status: "ready"; readonly shelf: ShelfResponse };

/** 제품 선택에는 선반 목록만 필요하다. 성분 분석이나 회원 정보 실패가 선택을 막지 않게 한다. */
export function useSimilarityShelf() {
  const [state, setState] = useState<State>({ status: "loading" });
  const requestId = useRef(0);
  const load = useCallback(() => {
    const id = ++requestId.current;
    void fetchShelf().then(
      (shelf) => {
        if (id === requestId.current) setState({ status: "ready", shelf });
      },
      (error: unknown) => {
        if (id !== requestId.current) return;
        if (isSignedOut(error)) setState({ status: "signedOut" });
        else if (isAdminSession(error)) setState({ status: "adminSession" });
        else setState({ status: "error" });
      },
    );
  }, []);
  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);
  const retry = () => {
    setState({ status: "loading" });
    load();
  };
  return { state, retry };
}
