"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Edges = {
  /** 시작 쪽(위 또는 왼쪽)에 더 볼 것이 남았는지. */
  readonly start: boolean;
  /** 끝 쪽(아래 또는 오른쪽)에 더 볼 것이 남았는지. */
  readonly end: boolean;
};

type Axis = "vertical" | "horizontal";

/** 소수점 오차로 끝에 닿고도 1px 이 남았다고 나오는 것을 막는다. */
const SLACK = 1;

const read = (element: HTMLElement, axis: Axis): Edges => {
  const vertical = axis === "vertical";
  const offset = vertical ? element.scrollTop : element.scrollLeft;
  const view = vertical ? element.clientHeight : element.clientWidth;
  const total = vertical ? element.scrollHeight : element.scrollWidth;

  return { start: offset > SLACK, end: offset + view < total - SLACK };
};

/**
 * 스크롤되는 상자의 어느 쪽에 더 볼 것이 남았는지 알려 준다.
 *
 * 흐림을 양 끝에 늘 깔아 두면 끝까지 내린 뒤에도 마지막 줄이 흐려져 읽기 나쁘다.
 * 남은 쪽만 표시해 두고 스타일이 그쪽만 지우게 한다.
 *
 * 내용이 바뀌면 스크롤 없이도 남은 쪽이 달라진다(브랜드 검색으로 목록이 줄어드는 때가
 * 그렇다). 크기가 바뀌는 것을 지켜보다 다시 읽는다.
 */
export const useScrollEdges = (axis: Axis = "vertical") => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });

  const onScroll = useCallback(() => {
    const element = ref.current;
    if (element) setEdges(read(element, axis));
  }, [axis]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setEdges(read(element, axis));
    update();

    // 크기를 지켜볼 수 없는 환경도 있다. 흐림은 덤이라 없으면 없는 대로 둔다.
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);

    return () => observer.disconnect();
  }, [axis]);

  return { ref, edges, onScroll };
};
