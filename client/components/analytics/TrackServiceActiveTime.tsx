"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { startServiceActiveTime } from "./service-active-time";

import { afterAnalyticsReady } from "@/lib/analytics/analytics-ready";

/** 프리페치·서버 렌더링에서는 실행하지 않고 브라우저의 commit 뒤에 측정한다. */
export function TrackServiceActiveTime() {
  const pathname = usePathname();
  const committedPathname = useRef(pathname);
  const tracker = useRef<ReturnType<typeof startServiceActiveTime> | undefined>(undefined);
  useEffect(() => {
    committedPathname.current = pathname;
    tracker.current?.navigate(pathname);
  }, [pathname]);
  useEffect(
    () =>
      afterAnalyticsReady((client) => {
        const current = startServiceActiveTime(client, committedPathname.current);
        tracker.current = current;
        return () => {
          current.stop();
          tracker.current = undefined;
        };
      }),
    [],
  );
  return null;
}
