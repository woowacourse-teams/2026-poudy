"use client";

import { useLayoutEffect } from "react";

import { readAppInfo } from "@/lib/analytics/app-info";
import { planAppEntry } from "@/lib/navigation/open-app";

/** 앱 설치 QR 코드로 들어온 사람을 환경에 맞는 곳으로 바로 넘긴다. */
export function AppEntryRedirect() {
  useLayoutEffect(() => {
    const isPoudyApp = readAppInfo(window.__POUDY_APP__).is_app || Boolean(window.ReactNativeWebView);

    window.location.replace(planAppEntry(window.location.href, navigator.userAgent, isPoudyApp));
  }, []);

  return null;
}
