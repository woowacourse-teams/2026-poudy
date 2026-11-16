"use client";

import {
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useRef,
} from "react";

/** 이 거리 안쪽의 움직임은 누름으로 본다(px). 큐레이션 캐러셀의 끌기 기준과 같다. */
const DRAG_THRESHOLD = 5;

type DragState = {
  readonly pointerId: number;
  /** 누른 줄. 훅 하나를 여러 줄에 펼쳐 넣어도 누른 줄만 민다. */
  readonly scroller: HTMLElement;
  readonly startX: number;
  readonly startScroll: number;
  moved: boolean;
  /** 끄는 동안 꺼 둔 스냅. 끝나면 이 값으로 돌려 놓는다. */
  snap?: string;
};

/**
 * 가로로 밀 것이 있는 줄인지 본다. 밀 것이 없는 줄에서 끌기로 받으면 칩을 누르다 조금 움직인 클릭까지 막는다.
 * 가로 넘침을 감춘 줄(디렉터리 레일의 세로 배치)은 넘쳐도 밀지 않는다. scrollLeft 는 감춘 줄도 옮기기 때문이다.
 */
const scrollsSideways = (scroller: HTMLElement) => {
  if (scroller.scrollWidth <= scroller.clientWidth) return false;
  const { overflowX } = getComputedStyle(scroller);
  return overflowX !== "hidden" && overflowX !== "clip";
};

const startDrag = (event: PointerEvent<HTMLElement>): DragState | undefined => {
  if (event.pointerType !== "mouse" || event.button !== 0) return undefined;

  const scroller = event.currentTarget;
  if (!scrollsSideways(scroller)) return undefined;

  return {
    pointerId: event.pointerId,
    scroller,
    startX: event.clientX,
    startScroll: scroller.scrollLeft,
    moved: false,
  };
};

const followPointer = (event: PointerEvent<HTMLElement>, active: DragState) => {
  const moved = event.clientX - active.startX;
  if (!active.moved && Math.abs(moved) < DRAG_THRESHOLD) return;

  const { scroller } = active;
  if (!active.moved) {
    active.moved = true;
    // 줄 밖으로 나가도 끌기가 이어진다. 이 시점에 칩은 pointerleave 를 받아 눌림 모양을 거둔다.
    // 누를 때 붙들면 뒤따르는 클릭의 대상이 칩에서 줄로 바뀌어 끌지 않은 누름까지 막힌다.
    scroller.setPointerCapture(event.pointerId);
    // 스냅이 켜진 줄(유튜버 카드)은 옮겨 적은 자리를 곧바로 가까운 칸으로 끌어당겨, 끈 만큼 따라오지 않고 칸에서 칸으로 튄다.
    active.snap = scroller.style.scrollSnapType;
    scroller.style.scrollSnapType = "none";
  }

  scroller.scrollLeft = active.startScroll - moved;
};

/** 끌기를 마친다. 꺼 둔 스냅을 돌려 놓으면 브라우저가 가까운 칸으로 붙인다. */
const finishDrag = (finished: DragState) => {
  if (finished.snap !== undefined)
    finished.scroller.style.scrollSnapType = finished.snap;
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
 * 가로 스크롤 영역을 마우스로 끌어 밀게 하는 이벤트 묶음(STATE S09 가로 스크롤 끌기). 스크롤 영역 요소에 펼쳐 넣는다.
 *
 * 손가락과 펜은 브라우저가 미는 동작을 가로 스크롤로 바꿔 주므로 건드리지 않는다. 마우스만 그 동작이 없다.
 * 안에 버튼이나 링크가 있어도 된다. 끌지 않은 누름은 그대로 지나가고, 끈 뒤에 따라오는 클릭만 막는다.
 * 목록을 그리며 줄마다 펼쳐 넣는 것처럼 여러 줄이 훅 하나를 나눠 써도 된다. 마우스는 한 번에 한 줄만 끈다.
 */
export function useDragScroll() {
  const drag = useRef<DragState | undefined>(undefined);
  const dragged = useRef(false);

  const stop = () => {
    const finished = drag.current;
    drag.current = undefined;
    if (finished) finishDrag(finished);
    return finished;
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (active?.pointerId !== event.pointerId) return;

    // 버튼을 뗀 것을 듣지 못했다(macOS 의 Ctrl+클릭 메뉴). 그대로 두면 버튼 없이 움직여도 줄이 따라온다.
    if ((event.buttons & 1) === 0) stop();
    else followPointer(event, active);
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (stop()?.moved) raiseForNextClick(dragged);
  };

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      stop();
      drag.current = startDrag(event);
    },
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => {
      stop();
    },
    // 링크와 그림은 누른 채 움직이면 브라우저가 집어 들고 pointercancel 을 보내 끌기가 끊긴다. 밀 줄에서는 집어 들지 않는다.
    onDragStart: (event: DragEvent<HTMLElement>) => {
      if (drag.current) event.preventDefault();
    },
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (dragged.current) swallow(event);
    },
  };
}
