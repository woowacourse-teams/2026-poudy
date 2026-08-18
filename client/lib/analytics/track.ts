"use client";

import type { EventMap, EventName } from "./events";

type Posthog = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  init: (key: string, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: Posthog;
  }
}

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/** 개발 환경의 이벤트가 운영 지표에 섞이지 않게 구분한다. */
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT ?? "development";

const enabled = Boolean(key) && environment !== "development";

/**
 * 화면은 이 함수만 부르고 PostHog SDK 를 직접 쓰지 않는다.
 * 도구를 바꿀 때 고칠 곳이 한 군데로 모인다.
 */
export const track = <T extends EventName>(event: T, properties: EventMap[T]): void => {
  if (!enabled) return;
  window.posthog?.capture(event, { ...properties, environment });
};

export const initAnalytics = async (): Promise<void> => {
  if (!enabled || typeof window === "undefined" || window.posthog) return;

  // 정의한 이벤트만 보낸다. 자동 수집은 이름이 제각각이라 퍼널을 만들기 어렵다.
  const { default: posthog } = await import("posthog-js");
  posthog.init(key as string, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
  });
  window.posthog = posthog as unknown as Posthog;
};
