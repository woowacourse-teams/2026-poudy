"use client";

import { useEffect, type RefObject } from "react";

/** 이만큼 움직이기 전에는 누름으로 본다. 손이 조금 떨려도 탭이 눌리게 둔다. */
const DRAG_THRESHOLD = 4;

type DragState = {
  pointerId: number | undefined;
  startX: number;
  startScroll: number;
  dragged: boolean;
};

const start = (element: HTMLElement, state: DragState, event: PointerEvent) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  state.pointerId = event.pointerId;
  state.startX = event.clientX;
  state.startScroll = element.scrollLeft;
  state.dragged = false;
};

const move = (element: HTMLElement, state: DragState, event: PointerEvent) => {
  if (event.pointerId !== state.pointerId) return;
  const distance = event.clientX - state.startX;
  if (!state.dragged && Math.abs(distance) < DRAG_THRESHOLD) return;

  if (!state.dragged) {
    state.dragged = true;
    // 끄는 동안 손이 줄 밖으로 나가도 계속 따라오게 잡아 둔다.
    element.setPointerCapture(event.pointerId);
    element.dataset.dragging = "true";
  }
  element.scrollLeft = state.startScroll - distance;
};

const end = (element: HTMLElement, state: DragState, event: PointerEvent) => {
  if (event.pointerId !== state.pointerId) return;
  state.pointerId = undefined;
  delete element.dataset.dragging;
};

/** 끌고 난 뒤 손을 떼면 그 자리의 링크가 눌린다. 끈 경우에는 이어지는 클릭을 한 번 막는다. */
const swallowClick = (state: DragState, event: MouseEvent) => {
  if (!state.dragged) return;
  state.dragged = false;
  event.preventDefault();
  event.stopPropagation();
};

/**
 * 가로로 넘치는 줄을 마우스로 끌어 밀 수 있게 한다.
 *
 * 터치와 트랙패드는 브라우저가 스스로 밀어 주지만, 마우스는 끌어도 줄이 움직이지 않는다.
 * 데스크톱에서 넘친 탭에 닿을 길이 없으므로 마우스 끌기만 따로 받는다.
 */
export const useDragScroll = (ref: RefObject<HTMLElement | null>, enabled: boolean) => {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const state: DragState = { pointerId: undefined, startX: 0, startScroll: 0, dragged: false };
    const listeners = [
      ["pointerdown", (event: Event) => start(element, state, event as PointerEvent)],
      ["pointermove", (event: Event) => move(element, state, event as PointerEvent)],
      ["pointerup", (event: Event) => end(element, state, event as PointerEvent)],
      ["pointercancel", (event: Event) => end(element, state, event as PointerEvent)],
    ] as const;
    const onClick = (event: MouseEvent) => swallowClick(state, event);

    listeners.forEach(([type, listener]) => element.addEventListener(type, listener));
    // 링크가 먼저 받기 전에 막아야 하므로 잡는 단계에서 듣는다.
    element.addEventListener("click", onClick, true);

    return () => {
      listeners.forEach(([type, listener]) => element.removeEventListener(type, listener));
      element.removeEventListener("click", onClick, true);
      delete element.dataset.dragging;
    };
  }, [ref, enabled]);
};
