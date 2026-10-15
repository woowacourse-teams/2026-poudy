"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

/** 길게 누르기로 보기까지의 시간 */
const LONG_PRESS_MS = 500;
/** 누른 자리에서 이만큼 움직이면 스크롤로 보고 길게 누르기를 취소한다. */
const MOVE_TOLERANCE = 10;
/** 칩과 툴팁 사이 간격 */
const GAP = 8;
/** 화면 가장자리에서 띄우는 거리(거터) */
const EDGE = 16;
/** 마우스를 올려 두고 툴팁을 열기까지 기다리는 시간. 칩 줄을 훑기만 할 때 칩마다 번쩍이지 않게 한다. */
const HOVER_DELAY_MS = 400;
/** 툴팁이 닫힌 뒤 이 시간 안에 옆 칩으로 옮기면 기다리지 않고 바로 연다. */
const WARM_MS = 300;

/** 마지막으로 툴팁이 닫힌 때. 툴팁끼리 나눠 쓴다. */
let lastClosedAt = 0;

/**
 * 길게 누르기 툴팁(명세 APP · 툴팁)의 여닫기. 줄여 보인 이름의 전체 이름을 보여 줄 때 쓴다.
 *
 * - 터치는 500ms 길게 누르면 열리고 손을 떼면 닫힌다. 그 전에 10px 넘게 움직이면 스크롤로 보고 취소한다.
 * - 마우스는 400ms 올려 두면 열리고 나가면 닫힌다. 다른 툴팁이 닫힌 직후(300ms 안)에는 기다리지 않는다.
 * - 키보드는 안의 버튼에 포커스가 오면 열리고 빠지면 닫힌다. Esc 로도 닫는다.
 *
 * enabled 는 여는 순간에 판단한다. 말줄임처럼 그려 봐야 아는 조건도 넘길 수 있다.
 */
export function useTooltip(enabled: () => boolean) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const hover = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(
    () => () => {
      cancelPress();
      clearTimeout(hover.current);
    },
    [],
  );

  // ref 콜백은 고정한다. 그릴 때마다 바뀌면 React 가 ref 를 뗐다 다시 붙이는데, 그 사이에 말풍선이 자리를 재면 칩을 찾지 못한다.
  const setAnchor = useCallback((element: HTMLElement | null) => {
    anchorRef.current = element;
  }, []);

  const anchorProps = {
    ref: setAnchor,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" || !enabled()) return;
      cancelPress();
      press.current = { timer: setTimeout(() => setOpen(true), LONG_PRESS_MS), x: event.clientX, y: event.clientY };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = press.current;
      if (current && Math.hypot(event.clientX - current.x, event.clientY - current.y) > MOVE_TOLERANCE) cancelPress();
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") return;
      cancelPress();
      setOpen(false);
    },
    onPointerCancel: () => {
      cancelPress();
      setOpen(false);
    },
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse" || !enabled()) return;
      clearTimeout(hover.current);
      // 시계가 뒤로 간 경우(경과 시간이 음수)는 방금 닫힌 것으로 보지 않는다.
      const elapsed = Date.now() - lastClosedAt;
      const warm = elapsed >= 0 && elapsed < WARM_MS;
      hover.current = setTimeout(() => setOpen(true), warm ? 0 : HOVER_DELAY_MS);
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      clearTimeout(hover.current);
      /*
       * 닫힌 때는 여기서 바로 적는다. 옆 칩으로 옮기면 브라우저가 이 칩의 나감과 옆 칩의 들어옴을 한 이벤트에서 잇달아
       * 처리해서, 그린 뒤에 적으면 옆 칩이 들어올 때 아직 '방금 닫힘'을 모른다.
       */
      if (open) lastClosedAt = Date.now();
      setOpen(false);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.target.matches(":focus-visible") && enabled()) setOpen(true);
    },
    onBlur: () => setOpen(false),
    // 길게 누르면 뜨는 브라우저 메뉴(복사·공유)가 툴팁을 가리지 않게 한다.
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      if (enabled()) event.preventDefault();
    },
  };

  return { open, anchorRef, anchorProps };
}

/**
 * 툴팁 말풍선. 시트나 가로 스크롤 줄에 잘리지 않도록 문서 맨 위층에 띄운다.
 * 칩 위쪽 가운데에 간격 8 로 뜨고, 위에 자리가 없으면 아래에 뜬다. 화면 끝에 걸리면 거터 안쪽으로 밀어 넣는다.
 * 전체 이름은 칩의 접근 가능한 이름이 이미 읽으므로 낭독에서 뺀다.
 */
export function TooltipBubble({
  open,
  anchorRef,
  children,
}: {
  readonly open: boolean;
  readonly anchorRef: { readonly current: HTMLElement | null };
  readonly children: ReactNode;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const bubble = bubbleRef.current;
    if (!open || !anchor || !bubble) return;
    const target = anchor.getBoundingClientRect();
    const own = bubble.getBoundingClientRect();
    const left = Math.min(
      Math.max(target.left + target.width / 2 - own.width / 2, EDGE),
      window.innerWidth - EDGE - own.width,
    );
    const above = target.top - GAP - own.height;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${above >= EDGE ? above : target.bottom + GAP}px`;
    bubble.style.visibility = "visible";
  }, [open, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={bubbleRef}
      aria-hidden="true"
      className="pointer-events-none invisible fixed top-0 left-0 z-(--z-toast) max-w-60 rounded-md bg-surface-inverse px-3 py-2 text-body-sm leading-snug font-medium text-on-dark"
    >
      {children}
    </div>,
    document.body,
  );
}
