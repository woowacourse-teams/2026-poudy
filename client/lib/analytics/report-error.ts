"use client";

import { track } from "./track";

/**
 * 화면이 무너져 오류 화면을 보여 줄 때 남긴다.
 *
 * apiGet 이 남기는 error_occurred 는 요청 하나가 실패한 것이고, 이쪽은 그 결과로
 * 사용자가 실제로 오류 화면을 만난 것이다. 둘을 surface 로 가른다.
 */
export const reportBoundaryError = (error: Error & { digest?: string }, surface: string): void => {
  track("error_occurred", {
    // digest 는 서버 오류를 서버 로그와 맞추는 열쇠다. 운영에서는 message 가 가려진다.
    error_code: error.digest ?? error.name ?? "UNKNOWN",
    status: 0,
    surface,
  });

  // PostHog 의 예외 수집으로도 보낸다. 스택이 붙어 원인을 찾기 쉽다.
  window.posthog?.captureException?.(error, { surface });
};
