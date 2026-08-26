"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])';

/** Tab 이 상자 밖으로 나가려 하면 반대쪽 끝으로 돌려보낸다. */
const keepInside = (sheet: HTMLElement, event: KeyboardEvent): void => {
  const focusable = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

/**
 * 열려 있는 동안 초점을 상자 안에 가둔다. 열 때는 안으로 옮기고 닫을 때는 되돌린다.
 * Escape 로 닫는 길도 함께 연다.
 */
export const useFocusTrap = (ref: RefObject<HTMLElement | null>, active: boolean, onEscape: () => void) => {
  useEffect(() => {
    if (!active) return;

    const sheet = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    sheet?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
        return;
      }
      if (event.key === "Tab" && sheet) keepInside(sheet, event);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [ref, active, onEscape]);
};
