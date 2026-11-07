"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * 요소의 높이를 재어 문서 뿌리의 CSS 변수로 알린다.
 *
 * 토스트와 떠 있는 문의 버튼은 하단 영역의 형제나 조상이 아니어서 그 높이를 물려받지 못하고, 앱은 문서 뿌리의 변수로만 자리를 정한다.
 * 버튼 글자가 두 줄이 되거나 시트 하단의 안내 줄이 늘면 높이가 달라지므로 값을 적어 두지 않고 잰다. 그리기 전에 재어 첫 화면부터 맞춘다.
 */
export function useRootHeightVariable<T extends HTMLElement>(name: `--${string}`, enabled: boolean) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    const root = document.documentElement;
    const measure = () => root.style.setProperty(name, `${element.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);

    return () => {
      observer?.disconnect();
      root.style.removeProperty(name);
    };
  }, [enabled, name]);

  return ref;
}
