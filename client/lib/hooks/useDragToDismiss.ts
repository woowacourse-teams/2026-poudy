"use client";

import { useCallback, useRef, useState } from "react";

/** 이만큼 내렸으면 닫는다. */
const DISTANCE_THRESHOLD = 96;
/** 조금만 내렸어도 이 속도보다 빠르게 튕겼으면 닫는다(px/ms). */
const VELOCITY_THRESHOLD = 0.5;

type Drag = {
  readonly pointerId: number;
  readonly startY: number;
  readonly startedAt: number;
};

/** 놓은 자리가 닫을 만큼인지. 멀리 내렸거나 빠르게 튕겼으면 닫는다. */
const shouldDismiss = (started: Drag, clientY: number): boolean => {
  const distance = Math.max(0, clientY - started.startY);
  const elapsed = Math.max(1, Date.now() - started.startedAt);

  return distance >= DISTANCE_THRESHOLD || distance / elapsed >= VELOCITY_THRESHOLD;
};

/**
 * 시트를 아래로 끌어 닫는다.
 *
 * 손가락을 따라 시트가 내려오고, 놓았을 때 충분히 내렸거나 빠르게 튕겼으면 닫는다.
 * 그 밖에는 제자리로 되돌린다. 위로는 끌지 않는다. 시트는 이미 제자리에 있다.
 */
export const useDragToDismiss = (onDismiss: () => void) => {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | undefined>(undefined);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    // 마우스는 왼쪽 버튼만 받는다. 오른쪽 버튼으로 끌리면 메뉴와 겹친다.
    if (event.pointerType === "mouse" && event.button !== 0) return;

    drag.current = { pointerId: event.pointerId, startY: event.clientY, startedAt: Date.now() };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const started = drag.current;
    if (started?.pointerId === event.pointerId) setOffset(Math.max(0, event.clientY - started.startY));
  }, []);

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const started = drag.current;
      if (!started || started.pointerId !== event.pointerId) return;

      drag.current = undefined;
      setDragging(false);

      /*
       * 어느 쪽이든 끌던 자리는 놓아 준다. 남겨 두면 inline transform 이 남아
       * 내려가는 전환을 덮어써 손을 뗀 자리에 그대로 멈춘다.
       *
       * 되돌아가는 모습도 내려가는 모습도 전환이 그린다. 여기서는 목적지만 정한다.
       */
      setOffset(0);
      if (shouldDismiss(started, event.clientY)) onDismiss();
    },
    [onDismiss],
  );

  const handleProps = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return { offset, dragging, handleProps };
};
