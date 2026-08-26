"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Edges = {
  /** 위로 더 볼 것이 남았는지. */
  readonly top: boolean;
  /** 아래로 더 볼 것이 남았는지. */
  readonly bottom: boolean;
};

/** 소수점 오차로 끝에 닿고도 1px 이 남았다고 나오는 것을 막는다. */
const SLACK = 1;

const read = (element: HTMLElement): Edges => ({
  top: element.scrollTop > SLACK,
  bottom: element.scrollTop + element.clientHeight < element.scrollHeight - SLACK,
});

/**
 * 스크롤되는 상자의 어느 쪽에 더 볼 것이 남았는지 알려 준다.
 *
 * 흐림을 양 끝에 늘 깔아 두면 끝까지 내린 뒤에도 마지막 줄이 흐려져 읽기 나쁘다.
 * 남은 쪽만 표시해 두고 스타일이 그쪽만 지우게 한다.
 *
 * 내용이 바뀌면 스크롤 없이도 남은 쪽이 달라진다(브랜드 검색으로 목록이 줄어드는 때가
 * 그렇다). 크기가 바뀌는 것을 지켜보다 다시 읽는다.
 */
export const useScrollEdges = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>({ top: false, bottom: false });

  const onScroll = useCallback(() => {
    const element = ref.current;
    if (element) setEdges(read(element));
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setEdges(read(element));
    update();

    // 크기를 지켜볼 수 없는 환경도 있다. 흐림은 덤이라 없으면 없는 대로 둔다.
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);

    return () => observer.disconnect();
  }, []);

  return { ref, edges, onScroll };
};
