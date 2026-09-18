"use client";

import { useEffect, useRef } from "react";

/** 목록 끝이 보이면 다음 페이지를 부른다. */
/** 표식은 빈 칸일 수도, 크롤러가 따라갈 다음 장 링크일 수도 있다. */
export const useInfiniteScroll = <T extends HTMLElement = HTMLDivElement>(enabled: boolean, onReach: () => void) => {
  const ref = useRef<T>(null);

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
