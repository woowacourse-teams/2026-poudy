"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { cn } from "./cn";

/**
 * 화면 골격(LAYOUT L04 · L09). 상단 내비 → 본문 → 하단 고정 순서로 쌓고, 스크롤 방식을 둘 중 하나로 고른다.
 *
 * - body(본문 내부 스크롤형): 하단 행동 영역이나 하단 내비가 있는 화면. 루트는 화면 높이(h-dvh)에 맞춰 넘치지 않고
 *   본문(ScreenBody)만 스크롤한다. 머리와 하단 영역은 줄지 않는다.
 * - document(문서 스크롤형): 하단 고정 영역 없이 끝나는 긴 상세·큐레이션. 문서 전체가 스크롤하고, 상단 내비는 위에
 *   붙는다(sticky). 하단 요소가 필요하면 sticky bottom-0 으로 두고 본문 끝 여백으로 자리를 비운다.
 *
 * TopBar 는 이 골격 안에서 '붙었는지'를 알아 아래 선을 긋는다. body 형은 본문이 스크롤된 뒤에, document 형은 바가
 * 화면 위에 붙은 뒤에 선이 나타난다.
 */
export type ScreenScroll = "body" | "document";

type ScreenState = {
  readonly scroll: ScreenScroll;
  /** body 형에서 본문이 맨 위에서 내려갔는지 */
  readonly bodyScrolled: boolean;
  readonly setBodyScrolled: (scrolled: boolean) => void;
};

const ScreenContext = createContext<ScreenState | null>(null);

/** 패키지 안에서 TopBar 가 쓴다. 골격 밖에서 그리면 null 이다. */
export const useScreen = () => useContext(ScreenContext);

/**
 * 흐름 안에 두는 표식. 1px 높이를 주고 음의 여백으로 되돌려 배치는 움직이지 않는다.
 * 높이가 0 이면 맨 위에서 표식이 경계에 정확히 걸려, WebKit 이 보인다고 알려 주지 않는 때가 있다.
 */
export const BOUNDARY_MARKER = "pointer-events-none h-px -mb-px shrink-0";

/**
 * 표식이 root(없으면 화면)의 위쪽 경계를 지나 위로 올라갔는지 본다. 붙는 요소 바로 앞에 표식을 두면, 표식이 지나간
 * 뒤가 곧 붙어 있는 동안이다.
 */
export function usePassedTop<T extends HTMLElement>(root?: RefObject<Element | null>, enabled = true) {
  const ref = useRef<T>(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === "undefined") return;
    const rootElement = root?.current ?? null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? 0;
        setPassed(entry.boundingClientRect.top < top);
      },
      { root: rootElement },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, root]);

  return { ref, passed: enabled && passed };
}

export type ScreenProps = {
  readonly scroll: ScreenScroll;
  /** TopBar, ScreenBody, BottomActionBar, BottomNavigation 을 이 순서로 넣는다(A11Y D05 읽기 순서). */
  readonly children: ReactNode;
  /** 자리. 바탕색과 폭 같은 모양은 앱 셸이 정한다. */
  readonly className?: string;
};

export function Screen({ scroll, children, className }: ScreenProps) {
  const [bodyScrolled, setBodyScrolled] = useState(false);

  return (
    <ScreenContext value={{ scroll, bodyScrolled, setBodyScrolled }}>
      <div
        data-scroll={scroll}
        className={cn("flex flex-col", scroll === "body" ? "h-dvh overflow-hidden" : "min-h-dvh", className)}
      >
        {children}
      </div>
    </ScreenContext>
  );
}

export type ScreenBodyProps = {
  readonly children: ReactNode;
  /**
   * 거터와 끝 여백 같은 자리. 거터는 스크롤 컨테이너인 이 칸 한 곳이 맡는다(px-gutter, LAYOUT L09).
   * 끝 여백은 기본 pb-6, 하단 고정 영역 없이 끝나는 긴 상세는 pb-10 이다. 가로 트랙처럼 화면 끝까지 닿는 내용이
   * 있으면 거터를 빼고 안쪽 블록이 맡는다.
   */
  readonly className?: string;
};

/**
 * 화면 본문. body 형에서는 이 칸만 스크롤한다(min-h-0 이 없으면 본문이 내용 높이로 늘어 스크롤이 생기지 않는다).
 */
export function ScreenBody({ children, className }: ScreenBodyProps) {
  const screen = useScreen();
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollsHere = screen?.scroll === "body";
  const { ref, passed } = usePassedTop<HTMLDivElement>(bodyRef, scrollsHere);
  const setBodyScrolled = screen?.setBodyScrolled;

  useEffect(() => {
    setBodyScrolled?.(passed);
  }, [passed, setBodyScrolled]);

  return (
    <div
      ref={bodyRef}
      className={cn("flex flex-col", scrollsHere ? "min-h-0 flex-1 overflow-y-auto" : "flex-1", className)}
    >
      {scrollsHere ? <div ref={ref} aria-hidden="true" className={BOUNDARY_MARKER} /> : null}
      {children}
    </div>
  );
}
