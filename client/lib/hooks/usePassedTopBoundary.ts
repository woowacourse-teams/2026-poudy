"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 흐름 안에 두는 표식의 모양. 1px 높이를 주고 음의 여백으로 되돌려 배치는 움직이지 않는다.
 *
 * 높이가 0이면 맨 위에서 표식이 경계선에 정확히 걸린다. WebKit 은 이때 보인다고 알려 주지
 * 않아, 앞 화면에서 스크롤된 채 넘어온 뒤 맨 위로 돌아가도 지나간 상태가 풀리지 않는다.
 * 1px 이 있으면 맨 위에서 경계 안쪽에 확실히 걸친다.
 */
export const BOUNDARY_MARKER_CLASS = "h-px -mb-px";

type TopBoundaryOptions = {
  /** 이 높이보다 위로 지나가면 `passed` 가 된다(px). */
  readonly enterAt: number;
  /** 되돌아올 때 이 높이까지 내려와야 `passed` 를 해제한다. */
  readonly leaveAt?: number;
  readonly enabled?: boolean;
};

const observeTopBoundary = (
  element: HTMLElement,
  boundary: number,
  update: (above: boolean) => void,
): IntersectionObserver => {
  const observer = new IntersectionObserver(
    ([entry]) => update(entry.boundingClientRect.top < (entry.rootBounds?.top ?? boundary)),
    { rootMargin: `-${boundary}px 0px 0px 0px` },
  );

  observer.observe(element);
  return observer;
};

/**
 * 요소가 화면 위의 정해진 경계를 지나갔는지 관찰한다.
 *
 * `leaveAt` 을 더 크게 두면 진입과 이탈 경계 사이에 여유가 생겨, 경계에서 조금 흔들릴 때
 * 상태가 계속 뒤집히지 않는다. 같은 값이면 sticky 요소가 실제로 붙은 상태를 그대로 돌려준다.
 */
export function usePassedTopBoundary<T extends HTMLElement>({
  enterAt,
  leaveAt = enterAt,
  enabled = true,
}: TopBoundaryOptions) {
  const ref = useRef<T>(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === "undefined") return;

    if (enterAt === leaveAt) {
      const observer = observeTopBoundary(element, enterAt, setPassed);
      return () => observer.disconnect();
    }

    const enterObserver = observeTopBoundary(element, enterAt, (above) => {
      if (above) setPassed(true);
    });
    const leaveObserver = observeTopBoundary(element, leaveAt, (above) => {
      if (!above) setPassed(false);
    });

    return () => {
      enterObserver.disconnect();
      leaveObserver.disconnect();
    };
  }, [enabled, enterAt, leaveAt]);

  return { ref, passed: enabled && passed };
}
