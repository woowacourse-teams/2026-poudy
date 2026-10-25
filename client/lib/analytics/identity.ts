import { readAppInfo } from "./app-info";
import { afterAnalyticsReady } from "./deferred-posthog";
import type { AnalyticsAuthState } from "./events";

let authState: AnalyticsAuthState = "unknown";
let memberId: number | undefined;
let revision = 0;
let lastClient: Window["posthog"];
const listeners = new Set<() => void>();

export const analyticsIdentityRevision = (): number => revision;
export const analyticsAuthState = (): AnalyticsAuthState => authState;
export const subscribeAnalyticsIdentity = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const notify = () => listeners.forEach((listener) => listener());

/** 요청 중 로그아웃하거나 다른 계정으로 바뀌었으면 늦은 회원 응답을 버린다. */
export const identifyAnalyticsMember = (id: number, expectedRevision = revision): void => {
  if (typeof window === "undefined" || expectedRevision !== revision) return;
  if (memberId === id && authState === "signed_in" && lastClient === window.posthog) return;
  if (memberId !== undefined && memberId !== id) window.posthog?.reset?.();
  memberId = id;
  authState = "signed_in";
  revision += 1;
  window.posthog?.identify?.(`member:${id}`);
  lastClient = window.posthog;
  window.posthog?.register?.(readAppInfo(window.__POUDY_APP__));
  notify();
};

export const resetAnalyticsIdentity = (state: AnalyticsAuthState = "signed_out", expectedRevision = revision): void => {
  if (typeof window === "undefined" || expectedRevision !== revision) return;
  if (authState === state && memberId === undefined) return;
  const previouslyIdentified = memberId !== undefined;
  memberId = undefined;
  authState = state;
  revision += 1;
  if (previouslyIdentified) {
    window.posthog?.reset?.();
    window.posthog?.register?.(readAppInfo(window.__POUDY_APP__));
  } else {
    const expected = revision;
    let unsubscribe = () => {};
    unsubscribe = afterAnalyticsReady(() => {
      if (revision === expected && window.posthog?.get_property?.("$user_id")) {
        window.posthog.reset?.();
        window.posthog.register?.(readAppInfo(window.__POUDY_APP__));
      }
      queueMicrotask(() => unsubscribe());
    });
  }
  notify();
};
