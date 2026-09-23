"use client";

import { useEffect, useRef } from "react";

/**
 * 요소의 높이를 재어 문서의 CSS 변수로 알린다.
 *
 * 함께 붙는 줄이 서로의 높이에 맞춰 자리를 잡을 때 쓴다. 높이를 적어 두면 글꼴과 기기의
 * 글자 크기 설정에 따라 실제 높이와 어긋나 두 줄 사이에 틈이 생긴다. 서로 형제라 문서에
 * 둔다. 소수점까지 그대로 넘겨야 반올림한 만큼의 틈도 생기지 않는다.
 */
export function useHeightVariable<T extends HTMLElement>(name: `--${string}`, enabled = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    const root = document.documentElement;
    const measure = () => root.style.setProperty(name, `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(element);

    return () => {
      observer.disconnect();
      root.style.removeProperty(name);
    };
  }, [enabled, name]);

  return ref;
}
