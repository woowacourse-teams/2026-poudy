"use client";

import { useEffect } from "react";

/**
 * 시트가 열려 있는 동안 뒤 화면이 스크롤되지 않게 한다.
 *
 * 딤은 `fixed inset-0` 이라 누르는 것만 막고 휠과 손가락은 그대로 뒤로 넘어간다.
 *
 * 잠그는 대상은 `body` 가 아니라 `html` 이다. 이 화면을 굴리는 것이 `html` 이라
 * (`document.scrollingElement` 가 `HTML` 이다) `body` 에 걸면 막히지도 않고
 * 보던 자리마저 맨 위로 튄다.
 *
 * `position: fixed` 로 띄우는 방법은 쓰지 않는다. 이 서비스의 `body` 는 `max-width` 와
 * `margin-inline: auto`, `box-shadow` 로 가운데 놓인 카드 모양이라 자리를 띄우는 순간
 * 폭 계산이 달라져 무너진다. `overflow: hidden` 만 걸면 보던 자리는 그대로 남는다.
 *
 * 막대가 사라지며 생기는 폭 차이는 그만큼 안쪽 여백으로 메워 화면이 흔들리지 않게 한다.
 * 그 폭을 `--scrollbar-width` 로도 남긴다. `position: fixed` 로 뷰포트에 붙는 것들은
 * 이 여백 바깥에 있어 저 혼자 제자리에 남는다. 그것들이 본문과 가운데를 맞추려면
 * 같은 폭만큼 함께 밀어야 한다.
 */
export const useScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPadding = root.style.paddingRight;

    // 막대가 차지하던 폭. 막대가 없는 환경(모바일)에서는 0 이라 아무 일도 하지 않는다.
    const barWidth = window.innerWidth - root.clientWidth;

    root.style.overflow = "hidden";
    if (barWidth > 0) {
      const current = Number.parseFloat(window.getComputedStyle(root).paddingRight) || 0;
      root.style.paddingRight = `${current + barWidth}px`;
      root.style.setProperty("--scrollbar-width", `${barWidth}px`);
    }

    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPadding;
      root.style.removeProperty("--scrollbar-width");
    };
  }, [locked]);
};
