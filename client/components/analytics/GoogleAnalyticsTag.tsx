"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => {};

const browserAllowsTracking = (): boolean => {
  const doNotTrack = navigator.doNotTrack?.toLowerCase();
  return doNotTrack !== "1" && doNotTrack !== "yes";
};

const serverBlocksTracking = (): boolean => false;

/** 운영 측정 ID가 있고 브라우저가 추적을 거부하지 않았을 때만 Google 태그를 불러온다. */
export function GoogleAnalyticsTag() {
  const browserAllows = useSyncExternalStore(subscribe, browserAllowsTracking, serverBlocksTracking);
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const production = process.env.NEXT_PUBLIC_ENVIRONMENT === "production";

  if (!browserAllows || !production || !measurementId) return null;

  return <GoogleAnalytics gaId={measurementId} />;
}
