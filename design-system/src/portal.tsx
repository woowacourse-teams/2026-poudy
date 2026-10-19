"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const ROOT_ID = "overlay-root";

/**
 * 떠 있는 면(시트·뷰어·확인 시트·토스트·툴팁)을 그릴 자리. body 바로 아래 하나만 둔다(SHAPE E05).
 * z-index 는 같은 쌓임 맥락 안에서만 비교되므로, transform·filter·overflow 가 걸린 조상 안에 그리지 않는다.
 */
export const getOverlayRoot = (): HTMLElement => {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
};

const subscribe = () => () => {};

/** 서버와 첫 하이드레이션에서는 그리지 않고, 브라우저에서 그린다. 하이드레이션 불일치를 막는다. */
export function Portal({ children }: { readonly children: ReactNode }) {
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return inBrowser ? createPortal(children, getOverlayRoot()) : null;
}
