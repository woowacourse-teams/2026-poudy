"use client";

import { useEffect, useRef } from "react";

import { HOME_PAGE_VERSION, type HomeSection } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

const VIEW_RATIO = 0.5;
const VIEW_DURATION = 500;

/** 홈 섹션이 절반 이상 0.5초 동안 보였을 때 한 번만 노출로 기록한다. */
export const useHomeSectionView = (section: HomeSection, position: number) => {
  const ref = useRef<HTMLElement>(null);
  const viewed = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || viewed.current || typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= VIEW_RATIO);
        clearTimeout(timer);
        timer = undefined;

        if (!visible) return;
        timer = setTimeout(() => {
          if (viewed.current) return;
          viewed.current = true;
          track("home_section_viewed", { section, position, page_version: HOME_PAGE_VERSION });
          observer.disconnect();
        }, VIEW_DURATION);
      },
      { threshold: VIEW_RATIO },
    );

    observer.observe(element);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [position, section]);

  return ref;
};
