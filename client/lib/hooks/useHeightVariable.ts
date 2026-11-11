"use client";

import { useEffect, useRef } from "react";

const findDocumentRoot = () => document.documentElement;

/**
 * 요소의 높이를 재어 문서의 CSS 변수로 알린다.
 *
 * 함께 붙는 줄이 서로의 높이에 맞춰 자리를 잡을 때 쓴다. 높이를 적어 두면 글꼴과 기기의
 * 글자 크기 설정에 따라 실제 높이와 어긋나 두 줄 사이에 틈이 생긴다. 서로 형제라 문서에
 * 둔다. 소수점까지 그대로 넘겨야 반올림한 만큼의 틈도 생기지 않는다.
 *
 * 읽는 요소가 하나뿐이면 findTarget 으로 그 요소에 둔다. 문서에 두면 값이 바뀔 때마다 문서 전체의 스타일을 다시 계산한다.
 * 그 요소가 없으면 문서에 둔다.
 *
 * @param findTarget 변수를 둘 요소를 찾는다. 렌더마다 바뀌지 않도록 컴포넌트 밖에 선언한다.
 */
export function useHeightVariable<T extends HTMLElement>(
  name: `--${string}`,
  enabled = true,
  findTarget: () => HTMLElement | null = findDocumentRoot,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    const target = findTarget() ?? findDocumentRoot();
    const measure = () => target.style.setProperty(name, `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(element);

    return () => {
      observer.disconnect();
      target.style.removeProperty(name);
    };
  }, [enabled, name, findTarget]);

  return ref;
}
