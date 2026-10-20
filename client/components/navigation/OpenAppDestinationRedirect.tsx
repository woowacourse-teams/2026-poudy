"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useRef, type MouseEvent } from "react";

import { readAppInfo } from "@/lib/analytics/app-info";
import { flushAnalyticsBeforeNavigation, track } from "@/lib/analytics/track";
import { APP_STORE_URL, appInstallSourceOf, resolveOpenAppDestination } from "@/lib/navigation/open-app";

/** 앱 설치 QR 코드로 들어온 사람을 환경에 맞는 곳으로 바로 넘긴다. */
export function OpenAppDestinationRedirect() {
  const recorded = useRef(false);
  const storeRecorded = useRef(false);
  const manualStore = useRef(false);
  const { pressableProps } = usePressable();
  useEffect(() => {
    let active = true;
    const isPoudyApp = readAppInfo(window.__POUDY_APP__).is_app || Boolean(window.ReactNativeWebView);
    const webUrl = window.location.href;
    const source = appInstallSourceOf(webUrl);
    const destination = resolveOpenAppDestination(webUrl, navigator.userAgent, isPoudyApp);
    if (!isPoudyApp && !recorded.current) {
      recorded.current = true;
      if (new URL(webUrl).searchParams.get("store") !== "google_play" && source !== "install_banner") {
        track("app_install_landed", { source }, { beacon: true });
      }
      if (destination === APP_STORE_URL) {
        storeRecorded.current = true;
        track("app_store_redirected", { source, store: "google_play" }, { beacon: true });
      }
    }
    void flushAnalyticsBeforeNavigation().then(() => {
      if (active && !manualStore.current) window.location.replace(destination);
    });
    return () => {
      active = false;
    };
  }, []);

  const openStore = async (event: MouseEvent<HTMLAnchorElement>) => {
    // 새 탭·새 창은 링크의 기본 동작으로 남긴다.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    manualStore.current = true;
    if (!storeRecorded.current) {
      storeRecorded.current = true;
      track(
        "app_store_redirected",
        { source: appInstallSourceOf(window.location.href), store: "google_play" },
        { beacon: true },
      );
    }
    await flushAnalyticsBeforeNavigation();
    window.location.replace(APP_STORE_URL);
  };

  return (
    /*
     * 본문 안 보조 버튼(BTN · Secondary, 높이 48)의 모양이다. 디자인 시스템 Button 은 링크로 그릴 수 없어
     * 같은 클래스를 링크에 붙인다. 링크라 스크립트가 없어도 스토어로 갈 수 있다.
     * 글자를 키운 좁은 화면에서는 한 줄을 고집하지 않고 줄을 나눈다(A11Y D09). 그래서 높이는 최소값으로 둔다.
     */
    <a
      {...pressableProps}
      href={APP_STORE_URL}
      onClick={openStore}
      className="pressable press-scale fb-secondary inline-flex min-h-12 items-center justify-center rounded-xl bg-button-secondary px-4 py-2 text-center text-14 leading-snug font-semibold text-text-primary select-none"
    >
      Play 스토어에서 받기
    </a>
  );
}
