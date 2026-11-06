"use client";

import { useLayoutEffect, useRef } from "react";

const MOVE_MS = 350;
const MOVE_EASING = "cubic-bezier(0.3, 0.7, 0.2, 1)";

export const prefersReducedMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** 움직임 줄이기에서는 기다리지 않고 바로 다음 상태로 넘긴다. */
export const motionDelay = (ms: number): number => {
  if (prefersReducedMotion()) return 0;
  return ms;
};

type Position = { readonly left: number; readonly top: number };

/** 칩이 움직이는 중이어도 흔들리지 않게 transform 을 뺀 배치 자리로 잰다. 그릇(relative)을 기준으로 한다. */
const positionOf = (element: HTMLElement): Position => ({ left: element.offsetLeft, top: element.offsetTop });

/**
 * 칩 묶음이 바뀌어 자리가 옮겨진 칩과 묶음 이름을 원래 자리에서 새 자리로 미끄러지게 한다(FLIP).
 * 그릴 때마다 위치를 적어 두고, 다음에 그렸을 때 달라진 만큼 transform 으로 되돌린 데서 0 으로 옮긴다.
 * 새로 나타나는 칩은 앞 자리가 없어 저절로 빠진다. layout 이 바뀔 때마다 잰다.
 */
export const useMovedPositions = (containerRef: React.RefObject<HTMLElement | null>, layout: unknown) => {
  const positions = useRef(new Map<string, Position>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const elements = [...container.querySelectorAll<HTMLElement>("[data-flip]")];
    const reduced = prefersReducedMotion();
    const previous = positions.current;
    const next = new Map(elements.map((element) => [element.dataset.flip ?? "", positionOf(element)]));
    elements.forEach((element) => {
      const before = previous.get(element.dataset.flip ?? "");
      const after = next.get(element.dataset.flip ?? "");
      if (reduced || !before || !after) return;
      const x = before.left - after.left;
      const y = before.top - after.top;
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
      element.animate([{ translate: `${x}px ${y}px` }, { translate: "0 0" }], {
        duration: MOVE_MS,
        easing: MOVE_EASING,
      });
    });
    positions.current = next;
  }, [containerRef, layout]);
};
