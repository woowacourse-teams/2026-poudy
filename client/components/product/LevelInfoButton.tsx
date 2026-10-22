"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useId, useRef, useState } from "react";

/**
 * 수분감·유분감 안내 버튼(S60 ① · 토글팁). 누르면 바로 아래에 수분감과 유분감이 무엇인지만 알려 주는 말풍선을 연다.
 * 판정 근거는 설명하지 않는다(10/19 결정).
 *
 * - 길게 누르는 툴팁(APP · 툴팁)과 모양은 같고 여는 방식만 다르다. 한 번 눌러 열고, 다시 누르거나 바깥을 누르거나 Esc 로 닫는다.
 * - 말풍선은 버튼 아래 8 에 띄우고(감싸개의 위쪽 padding), 오른쪽 끝을 위치를 가진 바깥 줄(수분감·유분감 줄)의 오른쪽 끝에 맞춘다.
 *   버튼이 늘 줄 오른쪽에 붙어 명세에서도 말풍선이 오른쪽 거터에 닿는다. 연 뒤에 재지 않으므로 글자 크기나 화면 폭이
 *   바뀌어도 화면 밖으로 밀려나지 않는다.
 * - 말풍선은 상태 알림(role=status)으로 읽고 버튼과 aria-controls 로 잇는다.
 * - 보이는 버튼은 24 이고 누르는 영역은 44 로 넓힌다(A11Y D12).
 */
export function LevelInfoButton() {
  const [open, setOpen] = useState(false);
  const bubbleId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
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

  return (
    <span ref={rootRef} className="flex">
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
        {/*
          말풍선은 혼자 떠 있어 gap 을 걸 형제가 없다. 그래서 감싸개의 위쪽 padding 으로 줄과 8 을 띄운다.
          감싸개는 누르기를 통과시켜, 띄운 자리를 눌러도 바깥을 누른 것으로 닫힌다.
        */}
        {open ? (
          <div className="pointer-events-none absolute top-full right-0 z-(--z-popover) flex w-60 max-w-full pt-2">
            <div className="pointer-events-auto w-full rounded-md bg-surface-inverse px-3 py-2 text-left text-body-sm leading-snug font-medium text-pretty text-on-dark transition-opacity duration-(--duration-fast) ease-out starting:opacity-0">
              수분감은 바른 뒤 피부에 남는 촉촉함, 유분감은 번들거림의 정도예요.
            </div>
          </div>
        ) : null}
      </span>
    </span>
  );
}
