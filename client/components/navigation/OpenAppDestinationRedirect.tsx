"use client";

import { useEffect, useRef, type MouseEvent } from "react";

import { readAppInfo } from "@/lib/analytics/app-info";
import { flushAnalyticsBeforeNavigation, track } from "@/lib/analytics/track";
import { APP_STORE_URL, appInstallSourceOf, resolveOpenAppDestination } from "@/lib/navigation/open-app";

/** 앱 설치 QR 코드로 들어온 사람을 환경에 맞는 곳으로 바로 넘긴다. */
export function OpenAppDestinationRedirect() {
  const recorded = useRef(false);
  const storeRecorded = useRef(false);
  const manualStore = useRef(false);
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
    <a
      href={APP_STORE_URL}
      onClick={openStore}
      className="mt-2 flex h-11 items-center rounded-button border border-border px-5 text-[14px] font-bold text-text-primary"
    >
      Play 스토어에서 받기
    </a>
  );
}
