"use client";

import { createContext, useCallback, useContext, useState } from "react";

/** 하위 상단 내비(TopBar sub)의 높이. 이 선 아래로 지나간 것은 내비에 가려 보이지 않는다. */
const TOP_BAR_HEIGHT = 44;

type ScrollState = {
  /** 본문의 제품명이 상단 내비 아래로 지나갔는지. 내비 제목 자리에 제품 요약을 보인다(S24-1). */
  readonly summaryPassed: boolean;
  readonly observe: (element: HTMLElement | null) => (() => void) | undefined;
};

const Context = createContext<ScrollState | null>(null);

const useScrollState = () => {
  const state = useContext(Context);
  if (!state) throw new Error("ProductScrollState 안에서 쓴다.");
  return state;
};

/**
 * 제품 상세의 스크롤 상태. 본문의 제품명이 상단 내비 아래로 지나갔는지를 IntersectionObserver 로 알아,
 * 상단 내비가 읽게 한다. 스크롤 위치나 요소 위치를 읽지 않는다.
 *
 * 표식은 서버 컴포넌트인 본문 가운데에 놓이고 내비는 그 바깥에 있어, 표식과 읽는 쪽을 이 맥락으로 잇는다.
 * 저장 버튼은 하단 고정 바로 옮겨 가(S60) 더는 지나갔는지 보지 않는다.
 */
export function ProductScrollState({ children }: { readonly children: React.ReactNode }) {
  const [summaryPassed, setSummaryPassed] = useState(false);

  const observe = useCallback((element: HTMLElement | null) => {
    if (!element || typeof IntersectionObserver === "undefined") return undefined;
    // 화면 위에서 내비 높이만큼 뺀 선을 경계로 본다. 표식이 그 선 위로 올라가면 지나간 것이다.
    const observer = new IntersectionObserver(
      ([entry]) => setSummaryPassed(entry.boundingClientRect.top < (entry.rootBounds?.top ?? TOP_BAR_HEIGHT)),
      { rootMargin: `-${TOP_BAR_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <Context value={{ summaryPassed, observe }}>{children}</Context>;
}

/** 제품명 바로 뒤에 두는 표식. 높이가 없어 배치를 바꾸지 않는다. */
export function PassMarker() {
  const { observe } = useScrollState();
  return <div ref={observe} aria-hidden="true" className="pointer-events-none h-0" />;
}

export const useSummaryPassed = () => useScrollState().summaryPassed;
