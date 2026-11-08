"use client";

import { useCallback, useEffect, useRef } from "react";

import type { EventMap, EventName } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/** 절반 이상 0.5초 노출되거나 콘텐츠를 선택한 경우 한 번 기록한다. */
export const useVisibleView = <T extends EventName>(event: T, properties: EventMap[T], key: string) => {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(properties);
  useEffect(() => {
    latest.current = properties;
  }, [properties]);
  const recorded = useRef<string | undefined>(undefined);
  const record = useCallback(() => {
    if (recorded.current === key) return;
    recorded.current = key;
    track(event, latest.current);
  }, [event, key]);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    return observeVisible(ref.current, record);
  }, [record]);
  return { ref, record };
};

const observeVisible = (element: HTMLElement, record: () => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new IntersectionObserver(
    (entries) => {
      clearTimeout(timer);
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        timer = setTimeout(() => {
          record();
          observer.disconnect();
        }, 500);
      }
    },
    { threshold: 0.5 },
  );
  observer.observe(element);
  return () => {
    clearTimeout(timer);
    observer.disconnect();
  };
};
