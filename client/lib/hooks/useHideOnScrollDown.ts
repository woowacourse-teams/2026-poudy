"use client";

import { useEffect, useState } from "react";

type HideOnScrollDownOptions = {
  /** 문서가 이만큼 내려오기 전에는 숨기지 않는다(px). */
  readonly hideAfter?: number;
  /** 이만큼 넘게 움직여야 방향이 바뀐 것으로 본다(px). 손가락이 멈출 때의 떨림은 무시한다. */
  readonly tolerance?: number;
  readonly enabled?: boolean;
};

const clampedScrollY = () => {
  const root = document.documentElement;
  return Math.min(Math.max(window.scrollY, 0), Math.max(root.scrollHeight - root.clientHeight, 0));
};

/**
 * 아래로 내리면 숨기고 위로 올리면 다시 보일 줄의 상태.
 *
 * 방향은 스크롤 위치의 차이로만 알 수 있어 스크롤을 듣는다. 프레임마다 한 번만 읽고,
 * 값이 바뀔 때만 다시 그린다. iOS 가 끝에서 더 당겨질 때 생기는 음수와 끝 너머 값은
 * 방향으로 치지 않는다.
 */
export function useHideOnScrollDown({ hideAfter = 0, tolerance = 8, enabled = true }: HideOnScrollDownOptions) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const state = { frame: 0, anchor: clampedScrollY() };

    const read = () => {
      state.frame = 0;

      const y = clampedScrollY();

      if (y <= hideAfter) {
        state.anchor = y;
        setHidden(false);
        return;
      }

      const moved = y - state.anchor;
      if (Math.abs(moved) < tolerance) return;

      state.anchor = y;
      setHidden(moved > 0);
    };

    const handleScroll = () => {
      if (!state.frame) state.frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(state.frame);
    };
  }, [enabled, hideAfter, tolerance]);

  return enabled && hidden;
}
