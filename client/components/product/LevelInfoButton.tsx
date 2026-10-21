"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/** 화면 끝에서 띄우는 거리(거터) */
const EDGE = 16;

/**
 * 수분감·유분감 안내 버튼(S60 ① · 토글팁). 누르면 바로 아래에 수분감과 유분감이 무엇인지만 알려 주는 말풍선을 연다.
 * 판정 근거는 설명하지 않는다(10/19 결정).
 *
 * - 길게 누르는 툴팁(APP · 툴팁)과 모양은 같고 여는 방식만 다르다. 한 번 눌러 열고, 다시 누르거나 바깥을 누르거나 Esc 로 닫는다.
 * - 말풍선은 버튼 가운데 아래 8 에 띄우고, 화면 끝에 걸리면 거터 안쪽으로 밀어 넣는다.
 * - 말풍선은 상태 알림(role=status)으로 읽고 버튼과 aria-controls 로 잇는다.
 * - 보이는 버튼은 24 이고 누르는 영역은 44 로 넓힌다(A11Y D12).
 */
export function LevelInfoButton() {
  const [open, setOpen] = useState(false);
  const bubbleId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { pressableProps } = usePressable();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 말풍선 폭은 글자에 따라 달라 그린 뒤에 자리를 정한다. 앱이 가운데 놓이는 넓은 화면에서도 본문 폭 안에 둔다.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const bubble = bubbleRef.current;
    if (!open || !root || !bubble) return;
    const anchor = root.getBoundingClientRect();
    const frame = (root.closest("main") ?? document.documentElement).getBoundingClientRect();
    const width = bubble.getBoundingClientRect().width;
    const left = Math.min(
      Math.max(anchor.left + anchor.width / 2 - width / 2, frame.left + EDGE),
      frame.right - EDGE - width,
    );
    bubble.style.left = `${left - anchor.left}px`;
    bubble.style.visibility = "visible";
  }, [open]);

  return (
    <span ref={rootRef} className="relative flex">
      <button
        type="button"
        aria-label="수분감·유분감 설명"
        aria-expanded={open}
        aria-controls={bubbleId}
        {...pressableProps}
        onClick={() => setOpen((current) => !current)}
        className="pressable fb-surface relative flex size-6 items-center justify-center rounded-full text-text-secondary after:absolute after:-inset-2.5"
      >
        <Icon name="info-circle" size={16} />
      </button>
      <span id={bubbleId} role="status" className="contents">
        {open ? (
          <div
            ref={bubbleRef}
            className="invisible absolute top-full z-(--z-popover) mt-2 w-60 rounded-md bg-surface-inverse px-3 py-2 text-left text-body-sm leading-snug font-medium text-pretty text-on-dark transition-opacity duration-(--duration-fast) ease-out starting:opacity-0"
          >
            수분감은 바른 뒤 피부에 남는 촉촉함, 유분감은 번들거림의 정도예요.
          </div>
        ) : null}
      </span>
    </span>
  );
}
