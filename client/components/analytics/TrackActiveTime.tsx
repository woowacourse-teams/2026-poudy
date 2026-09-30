"use client";

import { useEffect } from "react";

import { createActiveTimeMeter } from "@/lib/analytics/active-time";
import type { ActiveTimeFlushReason, DetailPageType } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

export const HEARTBEAT_MS = 30_000;

/** 사람이 화면을 다루고 있다고 볼 입력. 스크롤은 깊이도 함께 재므로 따로 받는다. */
const INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/** 화면 맨 아래가 문서의 어디까지 내려왔는지. 한 화면에 다 들어오는 문서는 100 이다. */
const scrollPercentage = (): number => {
  const height = document.documentElement.scrollHeight;
  if (height <= 0) return 100;
  return ((window.scrollY + window.innerHeight) / height) * 100;
};

/**
 * 상세 화면의 활성 체류시간을 detail_active_time_recorded 로 보낸다.
 * 30초마다, 그리고 탭이 가려지거나 다른 화면으로 옮길 때 그 사이에 늘어난 만큼만 보낸다.
 */
export function TrackActiveTime({
  pageType,
  entityId,
}: {
  readonly pageType: DetailPageType;
  readonly entityId: number;
}) {
  useEffect(() => {
    const meter = createActiveTimeMeter({
      now: () => performance.now(),
      visible: document.visibilityState === "visible",
      focused: document.hasFocus(),
    });
    const pathname = window.location.pathname;
    meter.scroll(scrollPercentage());

    const flush = (reason: ActiveTimeFlushReason) => {
      const snapshot = meter.take();
      if (!snapshot) return;
      // 화면을 떠나는 중에는 모아 보내기를 기다릴 수 없어 비콘으로 바로 보낸다.
      const leaving = reason !== "heartbeat";
      track(
        "detail_active_time_recorded",
        { page_type: pageType, entity_id: entityId, ...snapshot, flush_reason: reason },
        { beacon: leaving },
      );
    };

    const handleVisibility = () => {
      const visible = document.visibilityState === "visible";
      meter.setVisible(visible);
      if (!visible) flush("hidden");
    };
    const handleFocus = () => meter.setFocused(true);
    const handleBlur = () => meter.setFocused(false);
    const handleInput = () => meter.input();
    const handleScroll = () => {
      meter.input();
      meter.scroll(scrollPercentage());
    };
    const handlePageHide = () => flush("pagehide");

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", handlePageHide);
    for (const type of INPUT_EVENTS) window.addEventListener(type, handleInput, { passive: true });
    const heartbeat = window.setInterval(() => flush("heartbeat"), HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", handlePageHide);
      for (const type of INPUT_EVENTS) window.removeEventListener(type, handleInput);
      // 같은 화면이 다른 대상을 보여 주게 되어도 효과가 다시 돌아 여기로 온다. 주소가 바뀌었으면 경로 변경으로 본다.
      flush(window.location.pathname === pathname ? "unmount" : "route_change");
    };
  }, [pageType, entityId]);

  return null;
}
