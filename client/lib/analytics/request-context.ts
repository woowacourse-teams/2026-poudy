/** 서버 컴포넌트도 API 모듈을 읽으므로 브라우저 SDK와 클라이언트 경계를 가져오지 않는다. */
export const analyticsRequestHeaders = (): Record<string, string> => {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    (process.env.NEXT_PUBLIC_ENVIRONMENT ?? "development") === "development"
  )
    return {};
  try {
    if (["1", "yes"].includes(navigator.doNotTrack?.toLowerCase() ?? "") || window.posthog?.has_opted_out_capturing?.())
      return {};
    const distinctId = window.posthog?.get_distinct_id?.();
    const sessionId = window.posthog?.get_session_id?.();
    if (!distinctId || !sessionId) return {};
    return { "X-Poudy-Analytics": "1", "X-POSTHOG-DISTINCT-ID": distinctId, "X-POSTHOG-SESSION-ID": sessionId };
  } catch {
    return {};
  }
};
