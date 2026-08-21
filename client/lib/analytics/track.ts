"use client";

import type { EventMap, EventName } from "./events";

type Posthog = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  captureException: (error: unknown, properties?: Record<string, unknown>) => void;
  init: (key: string, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: Posthog;
  }
}

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
/**
 * 같은 출처의 프록시 경로로 보낸다. PostHog 도메인으로 바로 보내면
 * 광고 차단기가 막아 이벤트가 유실된다. 넘기는 곳은 next.config.ts 가 정한다.
 */
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest";

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
    // 프록시를 쓰면 SDK 가 대시보드 주소를 알 수 없다. 따로 알려 준다.
    ui_host: "https://us.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,

    // 처리방침이 안내하는 거부 방법이다. 자사 도메인으로 받아 넘기는 탓에
    // 추적 차단기가 걸리지 않으므로, 브라우저가 보낸 거부 신호는 직접 지킨다.
    respect_dnt: true,

    // 잡히지 않은 예외와 거부된 프로미스를 자동으로 보낸다. 오류 화면은
    // reportBoundaryError 가 따로 남기고, 이쪽은 그 밖의 예외를 받는다.
    capture_exceptions: true,

    // 화면 녹화. 이벤트만으로는 왜 그렇게 눌렀는지 알 수 없어 초기 사용성 관찰에 쓴다.
    disable_session_recording: false,
    session_recording: {
      /**
       * 입력값은 기본으로 가리고 검색창만 연다. 검색 자동완성이 잘 뜨는지 보려면
       * 무엇을 치는지 보여야 하고, 검색어는 search_used 로 이미 남기고 있다.
       * SearchField 만 type="search" 라 이 한 줄이 검색창에만 걸린다.
       */
      maskAllInputs: true,
      maskInputOptions: { search: false },
      /** 저장함 목록은 그 사람의 관심사라 관찰 대상이 아니다. 화면에서 가린다. */
      maskTextSelector: "[data-private]",
    },
  });
  window.posthog = posthog as unknown as Posthog;
};
