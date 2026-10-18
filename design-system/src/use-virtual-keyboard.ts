"use client";

import { useEffect, useState } from "react";

/** 이보다 작게 줄어든 것은 키보드가 아니라 브라우저 툴바가 드나든 것으로 본다. */
const KEYBOARD_MIN_HEIGHT = 120;

const isEditable = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLInputElement &&
      !["button", "checkbox", "radio", "range", "reset", "submit", "file", "color", "image"].includes(element.type)));

/**
 * 가상 키보드가 화면 아래를 얼마나 가리는지(px). 키보드가 없으면 0 이다(A11Y D07).
 *
 * 레이아웃 뷰포트(innerHeight)와 보이는 뷰포트(visualViewport)의 차이로 잰다. 브라우저가 키보드만큼 레이아웃을
 * 줄여 주는 환경(Android 의 interactive-widget=resizes-content 등)에서는 차이가 없어 0 이 되고, 이때는 따로
 * 올릴 필요도 없다. 입력에 포커스가 있을 때만 키보드로 본다. 툴바가 드나드는 차이는 KEYBOARD_MIN_HEIGHT 로 거른다.
 */
export function useVirtualKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setInset(covered >= KEYBOARD_MIN_HEIGHT && isEditable(document.activeElement) ? Math.round(covered) : 0);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  return inset;
}
