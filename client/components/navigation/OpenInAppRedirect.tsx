"use client";

import { useLayoutEffect } from "react";

import { readAppInfo } from "@/lib/analytics/app-info";
import { planAppOpen } from "@/lib/navigation/open-app";

export function OpenInAppRedirect() {
  useLayoutEffect(() => {
    const isPoudyApp = readAppInfo(window.__POUDY_APP__).is_app || Boolean(window.ReactNativeWebView);
    const plan = planAppOpen(window.location.href, navigator.userAgent, isPoudyApp);

    if (plan.type !== "none") {
      window.history.replaceState(window.history.state, "", plan.webUrl);
    }

    if (plan.type === "open-app") {
      window.location.replace(plan.appUrl);
    }
  }, []);

  return null;
}
