"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * 상단 내비 밑에 붙는 탭. 제품 상세의 구성품 탭과 같이, 붙은 채로 탭을 바꾸면 새 패널의 처음으로 옮겨 탭 줄이 제자리에
 * 남고 밑줄이 옆으로만 움직인다. 붙은 탭 줄 높이만큼은 패널의 scroll-margin 이 띄운다.
 */
export const usePinnedTabs = <T>(value: T, stuckAt: number) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollToPanel = useRef(false);

  useLayoutEffect(() => {
    if (!scrollToPanel.current) return;
    scrollToPanel.current = false;
    panelRef.current?.scrollIntoView({ block: "start" });
  }, [value]);

  /** 탭을 바꾸기 직전에 부른다. 이때 탭 줄이 붙어 있었는지 기억한다. */
  const willSelect = () => {
    const top = tabsRef.current?.getBoundingClientRect().top;
    scrollToPanel.current = top !== undefined && top <= stuckAt + 1;
  };

  return { tabsRef, panelRef, willSelect };
};
