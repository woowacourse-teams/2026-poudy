"use client";

import posthog, { type PostHog } from "posthog-js";

import { readAppInfo } from "./app-info";

const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest";

export const createPosthog = (key: string): PostHog => {
  posthog.init(key, {
    api_host: host,
    // 익명 방문자도 Person 프로필을 만들어 Retention 상세에서 방문자별 행동을 볼 수 있게 한다.
    person_profiles: "always",
    // 프록시를 쓰면 SDK 가 대시보드 주소를 알 수 없다. 따로 알려 준다.
    ui_host: "https://us.posthog.com",

    /**
     * SDK 가 딸린 script 를 body 의 첫 script 앞에 끼워 넣는 것이 기본값이다.
     * 그 자리는 본문 맨 앞의 JSON-LD 라, 하이드레이션이 제 노드를 찾지 못하고
     * 다시 그리면서 구조화 데이터가 둘로 남는다. 머리 쪽으로 보내 본문을 건드리지 않는다.
     */
    external_scripts_inject_target: "head",
    autocapture: false,
    // 먼저 보관한 최초 페이지뷰를 재생한 뒤 history_change/pageleave 수집을 켠다.
    // 초기화 시점의 페이지뷰까지 자동 전송하면 첫 방문을 두 번 센다.
    capture_pageview: false,
    capture_pageleave: false,

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

  posthog.register(readAppInfo(window.__POUDY_APP__));

  return posthog;
};
