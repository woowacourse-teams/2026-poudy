"use client";

import { useCallback, useEffect, useRef } from "react";

import type { EventMap, EventName } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

const observeExposure = (element: HTMLElement, record: () => void): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let visible = false;
  const cancel = () => clearTimeout(timer);
  const schedule = () => {
    cancel();
    if (!visible || document.visibilityState === "hidden") return;
    timer = setTimeout(() => {
      record();
      observer.disconnect();
    }, 500);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      schedule();
    },
    { threshold: 0.5 },
  );
  observer.observe(element);
  document.addEventListener("visibilitychange", schedule);
  return () => {
    cancel();
    observer.disconnect();
    document.removeEventListener("visibilitychange", schedule);
  };
};

/** 작은 제목·버튼이 절반 이상 0.5초 보인 경우만 노출로 기록한다. */
export const useEventExposure = <T extends EventName>(
  event: T,
  properties: EventMap[T],
  { enabled = true, viewKey = "view" }: { readonly enabled?: boolean; readonly viewKey?: string } = {},
) => {
  const target = useRef<HTMLElement | null>(null);
  const seen = useRef(new Set<string>());
  const ref = useCallback((element: HTMLElement | null) => {
    target.current = element;
  }, []);
  const serialized = JSON.stringify(properties);
  useEffect(() => {
    const element = target.current;
    if (!element || !enabled || seen.current.has(viewKey) || typeof IntersectionObserver === "undefined") return;
    return observeExposure(element, () => {
      if (seen.current.has(viewKey)) return;
      seen.current.add(viewKey);
      track(event, JSON.parse(serialized) as EventMap[T]);
    });
  }, [enabled, event, serialized, viewKey]);
  return ref;
};
