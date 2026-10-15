"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

/**
 * 누를 수 있는 자리의 hover·눌림 상태를 맡는다(명세 STATE S05·S11 의 usePressable 계약).
 *
 * 이 훅은 data-hovered · data-pressed 만 붙이고 뗀다. 어떻게 보일지는 fb-* 유틸리티와 press-scale 이 정한다.
 * CSS :hover · :active 를 쓰지 않는 까닭은, 스크롤하며 스친 행이 깜박이거나 누른 채 밖으로 끌었다 돌아와
 * 뗀 누름이 확정되는 일을 CSS 만으로는 막을 수 없어서다.
 */
export type PressableOptions = {
  /** disabled 속성이나 aria-disabled 로 막힌 상태 */
  readonly disabled?: boolean;
  /** 확정 직후 처리 중이라 다시 누를 수 없는 상태 */
  readonly busy?: boolean;
  /**
   * 눌림을 켜기까지 기다리는 시간(ms). 스크롤 목록의 행은 80~100 을 준다. 손가락으로 스크롤하며 스친
   * 행이 눌린 것처럼 깜박이지 않는다. 버튼은 0 이다.
   */
  readonly delayMs?: number;
};

/** 누른 자리에서 이만큼 움직이면 스크롤로 보고 누름을 취소한다(명세 STATE S05). */
const MOVE_TOLERANCE = 10;

type PressSequence = {
  id: number;
  x: number;
  y: number;
  canceled: boolean;
  shown: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
};

const isInside = (event: { clientX: number; clientY: number }, element: Element) => {
  const rect = element.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
};

/** 마우스처럼 올려 둘 수 있는 포인터가 있는 환경에서만 hover 를 켠다. 손가락은 누를 때 hover 가 잘못 걸린다. */
const canHover = () =>
  typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches === true;

export function usePressable({ disabled = false, busy = false, delayMs = 0 }: PressableOptions = {}) {
  const blocked = disabled || busy;
  // 지연 타이머처럼 나중에 도는 콜백이 그때의 막힘 여부를 보도록 최신 값을 담아 둔다.
  const blockedRef = useRef(blocked);
  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const seq = useRef<PressSequence>({
    id: -1,
    x: 0,
    y: 0,
    canceled: false,
    shown: false,
    timer: undefined,
  });

  const press = useCallback(() => {
    seq.current.shown = true;
    setPressed(true);
  }, []);
  const release = useCallback(() => setPressed(false), []);
  const cancel = useCallback(() => {
    clearTimeout(seq.current.timer);
    seq.current.canceled = true;
    setPressed(false);
  }, []);

  // 막히는 순간 예약한 눌림을 거두고 진행 중인 누름을 무효로 한다. 뒤따르는 click 은 onClickCapture 가 막는다.
  useEffect(() => {
    if (!blocked) return;
    clearTimeout(seq.current.timer);
    seq.current.canceled = true;
  }, [blocked]);

  useEffect(() => {
    const current = seq.current;
    return () => clearTimeout(current.timer);
  }, []);

  // 막힌 동안에는 눌림과 hover 를 보이지 않는다. 포인터가 그대로 있어 pointerleave 가 오지 않아도 바로 사라진다.
  const showPressed = pressed && !blocked;
  const showHovered = hovered && !blocked;

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    seq.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      canceled: false,
      shown: false,
      timer: undefined,
    };
    if (blocked || event.button !== 0) return;
    if (delayMs > 0) {
      seq.current.timer = setTimeout(() => {
        if (!blockedRef.current && !seq.current.canceled) press();
      }, delayMs);
    } else {
      press();
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerId !== seq.current.id || seq.current.canceled) return;
    const moved = Math.hypot(event.clientX - seq.current.x, event.clientY - seq.current.y) >= MOVE_TOLERANCE;
    // 터치는 pointerleave 가 늦게 와서 좌표로 직접 확인한다. 다시 들어와도 되살리지 않는다.
    if (moved || !isInside(event, event.currentTarget)) cancel();
  };

  // 브라우저가 스크롤을 시작하면 pointercancel 이 온다.
  const onPointerCancel = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerId === seq.current.id) cancel();
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerId !== seq.current.id) return;
    clearTimeout(seq.current.timer);
    // 마지막 move 뒤에 요소가 움직였을 수 있어, 뗀 자리를 다시 확인한다.
    if (!isInside(event, event.currentTarget)) seq.current.canceled = true;
    if (!seq.current.canceled && !blockedRef.current && !seq.current.shown) {
      // 지연보다 짧게 끝난 유효한 탭이다. 눌림을 켜고 한 번 그려진 뒤에 푼다. 같은 프레임에 켜고 풀면 그려지지 않는다.
      press();
      requestAnimationFrame(() => requestAnimationFrame(release));
      return;
    }
    release();
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    const keyboard = event.detail === 0;
    // 막힌 상태이거나 취소된 포인터 누름이면 확정하지 않는다. 링크 이동과 부모 카드의 click 까지 막는다.
    if (blocked || (!keyboard && seq.current.canceled)) {
      event.preventDefault();
      event.stopPropagation();
    }
    // 포인터 취소는 한 번만 쓴다. 키보드 click 은 포인터 취소로 막지 않는다.
    if (!keyboard) seq.current.canceled = false;
  };

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (!blocked && event.pointerType === "mouse" && canHover()) setHovered(true);
  };
  const onPointerLeave = () => setHovered(false);

  return {
    pressed: showPressed,
    hovered: showHovered,
    pressableProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerEnter,
      onPointerLeave,
      onClickCapture,
      "data-pressed": showPressed ? "" : undefined,
      "data-hovered": showHovered ? "" : undefined,
    },
  };
}

type Handler<E> = ((event: E) => void) | undefined;

/** 훅의 핸들러와 쓰는 쪽의 핸들러를 함께 부른다. 훅이 먼저 돌아 눌림 상태를 정한다. */
export function chainHandlers<E>(first: Handler<E>, second: Handler<E>) {
  if (!first) return second;
  if (!second) return first;
  return (event: E) => {
    first(event);
    second(event);
  };
}
