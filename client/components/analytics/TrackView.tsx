"use client";

import { useEffect } from "react";

import type { EventMap, EventName } from "@/lib/analytics/events";
import { completeShelfIntent } from "@/lib/analytics/shelf";
import { track } from "@/lib/analytics/track";

/**
 * 서버 컴포넌트인 상세 화면에서 조회 이벤트만 클라이언트로 떼어낸다.
 * 화면이 실제로 그려졌을 때 한 번만 보낸다.
 */
export function TrackView<T extends EventName>({
  event,
  properties,
}: {
  readonly event: T;
  readonly properties: EventMap[T];
}) {
  const key = JSON.stringify(properties);

  useEffect(() => {
    const value = JSON.parse(key) as EventMap[T];
    track(event, value);
    if (event === "product_viewed") {
      const product = value as EventMap["product_viewed"];
      if (product.has_my_filter) completeShelfIntent("view_product_filter", product.product_id);
    }
  }, [event, key]);

  return null;
}
