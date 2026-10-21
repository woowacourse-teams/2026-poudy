"use client";

import { useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/** 접수 완료 화면(S40c)의 요약 한 줄 */
export type SummaryRow = { readonly label: string; readonly value: string };

/** 서버가 400 으로 거절하면 입력 칸에 붙인다. 화면이 칸의 serverError 로 넘긴다. */
export const REJECTED_MESSAGE = "입력한 내용을 다시 확인해 주세요.";

/** 버튼 위 안내 줄 자리에 놓는 실패 이유. 400 은 칸에 붙이므로 여기 없다. */
const failureOf = (error: unknown): string | undefined => {
  if (error instanceof ApiError && error.status === 400) return undefined;
  if (error instanceof ApiError && error.status === 429) return "요청이 잦아요. 잠시 후 다시 시도해 주세요.";
  return "접수하지 못했어요. 잠시 후 다시 시도해 주세요.";
};

/**
 * 보내기 상태. 보내는 동안 다시 보내지 않고, 실패하면 적은 내용을 지우지 않는다.
 * 성공하면 요약을 남겨 접수 완료 화면으로 바꾼다.
 */
export function useSubmission() {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [rejected, setRejected] = useState(false);
  const [summary, setSummary] = useState<readonly SummaryRow[] | undefined>(undefined);
  // 상태가 다시 그려지기 전에 두 번 눌러도 요청은 한 번만 나간다.
  const inFlight = useRef(false);

  const submit = async (send: () => Promise<void>, onSent: () => readonly SummaryRow[]) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setFailure(undefined);
    setRejected(false);

    try {
      await send();
      setSummary(onSent());
    } catch (error) {
      setFailure(failureOf(error));
      setRejected(error instanceof ApiError && error.status === 400);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return {
    sending,
    failure,
    rejected,
    summary,
    submit,
    /** 고치기 시작하면 앞선 실패를 거둔다. */
    reset: () => {
      setFailure(undefined);
      setRejected(false);
    },
  };
}

/**
 * 문의를 연 화면으로 돌아간다. 문의를 시작한 자리를 담은 originPath 를 먼저 보고, 없으면 방문 기록, 그것도 없으면 홈이다.
 * 기록을 늘리지 않도록 replace 로 옮겨, 옮긴 뒤 뒤로 가도 접수 화면으로 돌아오지 않는다.
 */
export const leaveInquiry = (
  router: { readonly back: () => void; readonly replace: (href: string) => void },
  originPath: string | undefined,
) => {
  if (originPath && !originPath.startsWith("/inquiry")) {
    router.replace(originPath);
    return;
  }
  if (hasInSiteHistory()) {
    router.back();
    return;
  }
  router.replace("/");
};

/** 작성 화면의 뒤로가기. 사이트 안에서 들어왔으면 뒤로, 주소로 바로 들어왔으면 문의를 연 화면이나 홈으로 간다. */
export const backFromInquiry = (
  router: { readonly back: () => void; readonly replace: (href: string) => void },
  originPath: string | undefined,
) => {
  if (hasInSiteHistory()) {
    router.back();
    return;
  }
  router.replace(originPath && !originPath.startsWith("/inquiry") ? originPath : "/");
};
