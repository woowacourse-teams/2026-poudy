"use client";

import { useEffect, useRef } from "react";

/** 목록 끝이 보이면 다음 페이지를 부른다. */
export const useInfiniteScroll = (enabled: boolean, onReach: () => void) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target || !enabled) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onReach();
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, onReach]);

  return ref;
};
