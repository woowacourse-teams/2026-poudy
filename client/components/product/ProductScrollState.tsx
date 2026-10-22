"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** 하위 상단 내비(TopBar sub)의 높이. 이 선 아래로 지나간 것은 내비에 가려 보이지 않는다. */
const TOP_BAR_HEIGHT = 44;

type ScrollState = {
  /** 본문의 제품명이 상단 내비 아래로 지나갔는지. 내비 제목 자리에 제품 요약을 보인다(S24-1). */
  readonly summaryPassed: boolean;
  /** 제품 요약의 위시리스트 · 선반 버튼 줄이 상단 내비 아래로 다 지나갔는지. 하단 고정 바를 보인다(S24). */
  readonly actionsPassed: boolean;
  readonly observeSummary: (element: HTMLElement | null) => (() => void) | undefined;
  readonly observeActions: (element: HTMLElement | null) => (() => void) | undefined;
};

const Context = createContext<ScrollState | null>(null);

const useScrollState = () => {
  const state = useContext(Context);
  if (!state) throw new Error("ProductScrollState 안에서 쓴다.");
  return state;
};

/**
 * 요소가 상단 내비 아래로 지나갔는지 IntersectionObserver 로 지켜본다. 스크롤 위치나 요소 위치를 읽지 않는다.
 * 화면 위에서 내비 높이만큼 뺀 선을 경계로 보고, 요소의 아래 끝이 그 선 위로 올라가면 지나간 것이다.
 * 화면 아래에 있어 아직 보이지 않는 요소는 지나가지 않은 것으로 본다.
 */
const passObserver = (onChange: (passed: boolean) => void) => (element: HTMLElement | null) => {
  if (!element || typeof IntersectionObserver === "undefined") return undefined;
  const observer = new IntersectionObserver(
    ([entry]) => onChange(entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? TOP_BAR_HEIGHT)),
    { rootMargin: `-${TOP_BAR_HEIGHT}px 0px 0px 0px` },
  );
  observer.observe(element);
  return () => observer.disconnect();
};

/**
 * 제품 상세의 스크롤 상태. 본문의 제품명과 저장 버튼 줄이 상단 내비 아래로 지나갔는지 알아,
 * 상단 내비와 하단 고정 바가 읽게 한다.
 *
 * 표식은 서버 컴포넌트인 본문 가운데에 놓이고 읽는 쪽은 그 바깥에 있어, 표식과 읽는 쪽을 이 맥락으로 잇는다.
 */
export function ProductScrollState({ children }: { readonly children: React.ReactNode }) {
  const [summaryPassed, setSummaryPassed] = useState(false);
  const [actionsPassed, setActionsPassed] = useState(false);

  const observeSummary = useMemo(() => passObserver(setSummaryPassed), []);
  const observeActions = useMemo(() => passObserver(setActionsPassed), []);

  return <Context value={{ summaryPassed, actionsPassed, observeSummary, observeActions }}>{children}</Context>;
}

/** 제품명 바로 뒤에 두는 표식. 높이가 없어 배치를 바꾸지 않는다. */
export function PassMarker() {
  const { observeSummary } = useScrollState();
  return <div ref={observeSummary} aria-hidden="true" className="pointer-events-none h-0" />;
}

export const useSummaryPassed = () => useScrollState().summaryPassed;

/** 저장 버튼 줄이 지나갔는지 지켜볼 ref. 버튼 줄의 바깥 요소에 붙인다. */
export const useObserveActions = () => useScrollState().observeActions;

export const useActionsPassed = () => useScrollState().actionsPassed;
