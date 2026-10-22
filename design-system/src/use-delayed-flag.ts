"use client";

import { useEffect, useRef, useState } from "react";

/** 기다림 표시를 켜기까지 기다리는 시간. 이 안에 끝나는 요청은 아무것도 보이지 않는다(FEEDBACK F02). */
export const LOADING_DELAY_MS = 300;
/** 한 번 켠 기다림 표시를 적어도 이만큼 둔다. 켜자마자 꺼지며 깜박이지 않게 한다(F02). */
export const LOADING_MIN_DURATION_MS = 500;
/** 이만큼 지나도 끝나지 않으면 '시간이 조금 걸리고 있어요'와 [다시 시도]를 함께 보여 준다(F02). */
export const LOADING_SLOW_MS = 10_000;

export type DelayedFlagOptions = {
  /** 켜기까지 기다리는 시간(ms) */
  readonly delay?: number;
  /** 켠 뒤 적어도 유지하는 시간(ms) */
  readonly minDuration?: number;
};

/**
 * 기다림 표시(스피너, 스켈레톤)를 켤지 정한다. 늦게 켜고, 켜면 잠깐 유지한다(FEEDBACK F02).
 *
 *   const showLoading = useDelayedFlag(isPending);
 *
 * - flag 가 delay 안에 다시 꺼지면 한 번도 켜지 않는다.
 * - 켠 뒤 flag 가 꺼져도 minDuration 을 채운 뒤에 끈다. 그 사이 flag 가 다시 켜지면 그대로 켜 둔다.
 */
export function useDelayedFlag(
  flag: boolean,
  { delay = LOADING_DELAY_MS, minDuration = LOADING_MIN_DURATION_MS }: DelayedFlagOptions = {},
) {
  const [shown, setShown] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (flag && !shown) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, delay);
      return () => clearTimeout(timer);
    }
    if (!flag && shown) {
      const left = Math.max(0, minDuration - (Date.now() - shownAt.current));
      const timer = setTimeout(() => setShown(false), left);
      return () => clearTimeout(timer);
    }
  }, [flag, shown, delay, minDuration]);

  return shown;
}

/**
 * 기다림이 너무 길어졌는지. active 가 after 동안 끊이지 않고 켜져 있으면 true 다(F02 의 10초 규칙).
 * active 가 꺼지면 바로 false 로 돌아가고, 다시 켜지면 처음부터 잰다.
 */
export function useSlowFlag(active: boolean, after = LOADING_SLOW_MS) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setSlow(true), after);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [active, after]);

  return active && slow;
}
