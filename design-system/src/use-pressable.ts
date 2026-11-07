"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";

/**
 * 누를 수 있는 자리의 hover·눌림 상태를 맡는다(명세 STATE S05·S11 의 usePressable 계약).
 *
 * 이 훅은 data-hovered · data-pressed 만 붙이고 뗀다. 어떻게 보일지는 fb-* 유틸리티와 press-scale 이 정한다.
 * CSS :hover · :active 를 쓰지 않는 까닭은, 스크롤하며 스친 행이 깜박이거나 누른 채 밖으로 끌었다 돌아와
 * 뗀 누름이 확정되는 일을 CSS 만으로는 막을 수 없어서다.
 *
 * 키보드도 누르는 동안 같은 눌림을 켠다(S05 · S09). 버튼은 Space · Enter, 링크는 Enter 다. 확정(click)은 브라우저가 맡는다.
 * 키 핸들러는 capture 단계에 달아, 쓰는 쪽의 onKeyDown · onKeyUp · onBlur 를 덮어쓰지 않는다.
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

/**
 * 그 자리가 이 요소의 누르는 영역인지. ::after 로 넓힌 영역은 getBoundingClientRect 에 잡히지 않으므로, 상자 밖이면 그 자리를
 * 받는 요소를 다시 묻는다. 묻지 않으면 넓힌 영역에서 뗀 누름이 모두 취소되어 보이는 상자만 눌린다.
 */
const isInside = (event: { clientX: number; clientY: number }, element: Element) => {
  const rect = element.getBoundingClientRect();
  if (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  ) {
    return true;
  }
  // jsdom 에는 elementFromPoint 가 없다.
  const hit = document.elementFromPoint?.(event.clientX, event.clientY);
  return hit ? element.contains(hit) : false;
};

/** 이 요소를 확정하는 키. 링크는 Enter 로만 확정하고 Space 는 화면을 스크롤한다(S05). */
const isActivationKey = (key: string, element: HTMLElement) =>
  key === "Enter" || (key === " " && !(element instanceof HTMLAnchorElement));

/** 마우스처럼 올려 둘 수 있는 포인터가 있는 환경에서만 hover 를 켠다. 손가락은 누를 때 hover 가 잘못 걸린다. */
export const canHover = () =>
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
  // 지금 눌림을 켠 키. 포인터 누름과 섞이지 않도록 이 키의 keyup 에서만 푼다.
  const pressedKey = useRef<string | null>(null);
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
  // 막히는 순간 누름을 버린다. 포커스된 버튼이 disabled 가 되면 keyup 과 blur 가 오지 않아, 풀리고 나서 눌린 채로 남을 수 있다.
  if (blocked && pressed) setPressed(false);
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

  const onKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
    // 안에 든 입력칸이나 다른 버튼의 키는 이 자리의 누름이 아니다.
    if (blocked || event.repeat || event.target !== event.currentTarget) return;
    // macOS 는 Cmd 를 누른 동안 다른 키의 keyup 을 보내지 않아 눌림이 남는다. 조합키는 누름으로 보지 않는다.
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!isActivationKey(event.key, event.currentTarget)) return;
    pressedKey.current = event.key;
    setPressed(true);
  };

  const onKeyUpCapture = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== pressedKey.current) return;
    pressedKey.current = null;
    release();
  };

  // Enter 로 시트가 열려 포커스가 옮겨 가면 keyup 이 이 요소로 오지 않는다.
  const onBlurCapture = (event: FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || pressedKey.current === null) return;
    pressedKey.current = null;
    release();
  };

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (!blocked && event.pointerType === "mouse" && canHover()) setHovered(true);
  };
  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    setHovered(false);
    // 마우스가 빠르게 벗어나거나 부모가 포인터를 붙들면 move 와 up 이 이 요소로 오지 않아, 여기서 풀지 않으면 눌림이 남는다.
    // 터치는 뗀 직후 클릭보다 먼저 이 이벤트가 오므로 취소하지 않는다.
    if (event.pointerType === "mouse" && event.pointerId === seq.current.id) cancel();
  };

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
      onKeyDownCapture,
      onKeyUpCapture,
      onBlurCapture,
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
