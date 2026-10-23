"use client";

import { useEffect } from "react";

import { createActiveTimeMeter } from "@/lib/analytics/active-time";
import { observeBrowserActivity } from "@/lib/analytics/browser-activity";
import type { ActiveTimeEntity, ActiveTimeFlushReason } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

export const HEARTBEAT_MS = 30_000;

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
export function TrackActiveTime(
  props:
    | { readonly pageType: "product_detail" | "ingredient_detail"; readonly entityId: number }
    | { readonly pageType: "ingredient_group_detail"; readonly entityCode: string },
) {
  // 효과가 대상이 바뀔 때만 다시 돌도록 원시값 하나로 줄인다. 객체를 그대로 두면 그릴 때마다 새로 재기 시작한다.
  const entityKey = JSON.stringify(
    "entityCode" in props
      ? { page_type: props.pageType, entity_code: props.entityCode }
      : { page_type: props.pageType, entity_id: props.entityId },
  );

  useEffect(() => {
    const entity = JSON.parse(entityKey) as ActiveTimeEntity;
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
      track("detail_active_time_recorded", { ...entity, ...snapshot, flush_reason: reason }, { beacon: leaving });
    };

    const handleVisibility = () => {
      const visible = document.visibilityState === "visible";
      meter.setVisible(visible);
      if (!visible) flush("hidden");
    };
    const unsubscribe = observeBrowserActivity({
      input: () => meter.input(),
      scroll: () => meter.scroll(scrollPercentage()),
      visibility: handleVisibility,
      focus: (focused) => meter.setFocused(focused),
      pagehide: () => flush("pagehide"),
    });
    const heartbeat = window.setInterval(() => flush("heartbeat"), HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      unsubscribe();
      // 같은 화면이 다른 대상을 보여 주게 되어도 효과가 다시 돌아 여기로 온다. 주소가 바뀌었으면 경로 변경으로 본다.
      flush(window.location.pathname === pathname ? "unmount" : "route_change");
    };
  }, [entityKey]);

  return null;
}
