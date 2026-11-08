"use client";

import { useEffect, useRef } from "react";

import type { EventMap, EventName } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/** 재렌더링·Strict Mode로 같은 결과를 중복 집계하지 않는다. 새 결과와 재진입은 다시 센다. */
export const useTrackedView = <T extends EventName>(
  event: T,
  properties: EventMap[T],
  { key, enabled = true }: { readonly key: string; readonly enabled?: boolean },
): void => {
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!enabled || previous.current === key) return;
    previous.current = key;
    track(event, properties);
  }, [enabled, event, key, properties]);
};
