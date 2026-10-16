"use client";

import { useEffect } from "react";

/**
 * 지금 잠금을 건 시트 수. 마지막 시트가 풀 때만 원래 값으로 돌린다.
 *
 * 시트마다 잠그기 전 값을 따로 기억해 되돌리면 겹쳐 열린 시트가 서로의 값을 덮는다.
 * 제품 메뉴에서 평가 시트로 넘어가면 메뉴가 닫히는 전환 중에 평가 시트가 잠그므로,
 * 평가 시트는 이미 걸린 `hidden` 을 원래 값으로 기억한다. 메뉴가 먼저 풀고 평가 시트가
 * 나중에 풀면서 `hidden` 을 다시 걸어, 시트를 모두 닫아도 화면이 스크롤되지 않았다.
 */
let lockCount = 0;
let originalOverflow = "";

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
 * 전역의 `scrollbar-gutter: stable` 이 잠금 중에도 막대 자리를 유지한다.
 */
export const useScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;

    const root = document.documentElement;
    if (lockCount === 0) {
      originalOverflow = root.style.overflow;
      root.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) root.style.overflow = originalOverflow;
    };
  }, [locked]);
};
