"use client";

import type { PostHog, Properties } from "posthog-js";

import { afterPageLoad } from "./after-page-load";

type AnalyticsClient = Pick<PostHog, "capture" | "captureException">;
type PendingCapture = (client: AnalyticsClient) => void;

declare global {
  interface Window {
    posthog?: AnalyticsClient;
    __POUDY_APP__?: unknown;
  }
}

const pageProperties = (): Properties => ({
  $current_url: window.location.href,
  $pathname: window.location.pathname,
  $host: window.location.host,
  $referrer: document.referrer,
});

/** 호출 시점의 페이지와 시각을 보관한다. SDK가 준비된 뒤의 위치를 붙이면 퍼널이 달라진다. */
const bufferedClient = (pending: PendingCapture[]): AnalyticsClient => ({
  capture: (event, properties, options) => {
    const snapshot = { ...pageProperties(), ...properties };
    const capturedAt = options?.timestamp ?? new Date();
    pending.push((client) => {
      client.capture(event, snapshot, { ...options, timestamp: capturedAt });
    });
    return undefined;
  },
  captureException: (error, properties) => {
    const snapshot = { ...pageProperties(), ...properties };
    pending.push((client) => {
      client.captureException(error, snapshot);
    });
    return undefined;
  },
});

/** SDK의 history 수집이 시작되기 전에도 첫 방문과 빠른 SPA 이동을 기록한다. */
const bufferNavigation = (client: AnalyticsClient): (() => void) => {
  let previous = window.location.href;
  let active = true;
  const navigated = () => {
    // SDK의 history_change처럼 검색 조건이나 해시만 바뀐 경우에는 새 페이지로 세지 않는다.
    if (!active || new URL(previous).pathname === window.location.pathname) return;
    client.capture("$pageview");
    previous = window.location.href;
  };
  const restore = (["pushState", "replaceState"] as const).map((method) => {
    const original = window.history[method];
    const wrapped: typeof original = function (this: History, ...args) {
      original.apply(this, args);
      navigated();
    };
    window.history[method] = wrapped;
    return () => {
      if (window.history[method] === wrapped) window.history[method] = original;
    };
  });
  window.addEventListener("popstate", navigated);
  client.capture("$pageview");
  return () => {
    active = false;
    restore.forEach((reset) => reset());
    window.removeEventListener("popstate", navigated);
  };
};

const bufferErrors = (client: AnalyticsClient): (() => void) => {
  const onError = (event: ErrorEvent) => {
    client.captureException(event.error ?? new Error(event.message));
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    client.captureException(event.reason);
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
};

/** 초기 번들에는 큐만 포함하고, 무거운 SDK와 녹화 기능은 화면 로딩 이후 가져온다. */
export const deferPosthog = (key: string): void => {
  if (["1", "yes"].includes(navigator.doNotTrack?.toLowerCase() ?? "")) return;
  const pending: PendingCapture[] = [];
  const buffer = bufferedClient(pending);
  window.posthog = buffer;
  const stopNavigation = bufferNavigation(buffer);
  const stopErrors = bufferErrors(buffer);
  let loading = false;
  const start = () => {
    if (loading) return;
    loading = true;
    void import("./posthog-client")
      .then(({ createPosthog }) => {
        const client = createPosthog(key);
        stopNavigation();
        stopErrors();
        window.posthog = client;
        pending.splice(0).forEach((capture) => capture(client));
        client.set_config({ capture_pageview: "history_change", capture_pageleave: true });
      })
      .catch(() => {
        loading = false;
        // 일시적인 청크 다운로드 실패가 화면을 깨뜨리지 않게 하고 다음 조작에서 재시도한다.
        window.addEventListener("pointerdown", start, { once: true, passive: true });
      });
  };
  afterPageLoad(start);
};
