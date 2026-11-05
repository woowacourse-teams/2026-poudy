"use client";

import { type MouseEvent, type PointerEvent, type RefObject, useRef } from "react";

/** 이 거리 안쪽의 움직임은 누름으로 본다(px). 큐레이션 캐러셀의 끌기 기준과 같다. */
const DRAG_THRESHOLD = 5;

type DragState = {
  readonly pointerId: number;
  readonly startX: number;
  readonly startScroll: number;
  moved: boolean;
};

const startDrag = (event: PointerEvent<HTMLElement>): DragState | undefined => {
  if (event.pointerType !== "mouse" || event.button !== 0) return undefined;

  // 밀 것이 없는 줄에서 끌기로 받으면 칩을 누르다 조금 움직인 클릭까지 막는다.
  const scroller = event.currentTarget;
  if (scroller.scrollWidth <= scroller.clientWidth) return undefined;

  return { pointerId: event.pointerId, startX: event.clientX, startScroll: scroller.scrollLeft, moved: false };
};

const followPointer = (event: PointerEvent<HTMLElement>, active: DragState) => {
  const moved = event.clientX - active.startX;
  if (!active.moved && Math.abs(moved) < DRAG_THRESHOLD) return;

  const scroller = event.currentTarget;
  if (!active.moved) {
    active.moved = true;
    // 줄 밖으로 나가도 끌기가 이어진다. 이 시점에 칩은 pointerleave 를 받아 눌림 모양을 거둔다.
    // 누를 때 붙들면 뒤따르는 클릭의 대상이 칩에서 줄로 바뀌어 끌지 않은 누름까지 막힌다.
    scroller.setPointerCapture(event.pointerId);
  }

  scroller.scrollLeft = active.startScroll - moved;
};

/** 뒤따르는 클릭 한 번만 막도록 표시한다. 곧바로 풀어 그 뒤의 키보드 누름은 막지 않는다. */
const raiseForNextClick = (flag: RefObject<boolean>) => {
  flag.current = true;
  setTimeout(() => {
    flag.current = false;
  }, 0);
};

const swallow = (event: MouseEvent<HTMLElement>) => {
  event.preventDefault();
  event.stopPropagation();
};

/**
 * 가로 스크롤 영역을 마우스로 끌어 밀게 하는 이벤트 묶음. 스크롤 영역 요소에 펼쳐 넣는다.
 *
 * 손가락과 펜은 브라우저가 미는 동작을 가로 스크롤로 바꿔 주므로 건드리지 않는다. 마우스만 그 동작이 없다.
 * 안에 버튼이 있어도 된다. 끌지 않은 누름은 그대로 지나가고, 끈 뒤에 따라오는 클릭만 막는다.
 */
export function useDragScroll() {
  const drag = useRef<DragState | undefined>(undefined);
  const dragged = useRef(false);

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (active?.pointerId !== event.pointerId) return;

    // 버튼을 뗀 것을 듣지 못했다(macOS 의 Ctrl+클릭 메뉴). 그대로 두면 버튼 없이 움직여도 줄이 따라온다.
    if ((event.buttons & 1) === 0) drag.current = undefined;
    else followPointer(event, active);
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const finished = drag.current;
    if (finished?.pointerId !== event.pointerId) return;
    drag.current = undefined;
    if (finished.moved) raiseForNextClick(dragged);
  };

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      drag.current = startDrag(event);
    },
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => {
      drag.current = undefined;
    },
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (dragged.current) swallow(event);
    },
  };
}
