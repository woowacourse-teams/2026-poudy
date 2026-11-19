"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { markPop, markPush } from "@/lib/navigation/history-depth";

export function HistoryDepthTracker() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const popped = useRef(false);
  const pushed = useRef(false);

  useEffect(() => {
    /*
     * 같은 화면 안에서 쌓은 기록(유튜버 상세의 제품 칸 → 거른 영상 탭)을 되돌리면 경로가 바뀌지 않는다. 그때는 바로 빼고,
     * 경로가 바뀌기를 기다리는 표시는 두지 않는다. 남겨 두면 다음 이동을 되돌아간 것으로 보고 세지 않는다.
     */
    const handlePop = () => {
      markPop();
      if (window.location.pathname !== previous.current) popped.current = true;
    };

    window.addEventListener("popstate", handlePop);

    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  /*
   * 방문 기록에 항목을 실제로 더한 이동(pushState)만 센다. 카테고리 탭처럼 replace 로 옮기면 경로는 바뀌어도 기록은
   * 그대로라, 세면 깊이가 실제보다 커진다. 그러면 바로 들어온 화면에서도 뒤로가기가 기록이 있다고 보고 사이트 밖으로 나간다.
   * 라우터는 이동 때 pushState 를 먼저 부르고 그 뒤에 경로가 바뀌므로, 부른 적이 있는지 들고 있다가 경로가 바뀔 때 본다.
   */
  useEffect(() => {
    const { history } = window;
    const pushState = history.pushState;
    history.pushState = function (...args: Parameters<History["pushState"]>) {
      const [, , url] = args;
      const samePath =
        url != null && previous.current !== null && new URL(url, window.location.href).pathname === previous.current;
      const result = pushState.apply(this, args);
      /* 경로가 그대로인 기록(주소의 검색어만 바뀜)은 경로 변화를 기다리지 않고 바로 센다. */
      if (samePath) markPush();
      else pushed.current = true;
      return result;
    };

    return () => {
      history.pushState = pushState;
    };
  }, []);

  /*
   * 앞서 본 경로를 들고 비교한다. 붙은 적이 있는지만 두면 개발 모드의 이중 실행이 첫
   * 화면을 옮겨 온 것으로 세어, 밖에서 바로 들어온 경우를 개발 중에 볼 수 없게 된다.
   */
  useEffect(() => {
    if (previous.current === pathname) return;

    const first = previous.current === null;
    previous.current = pathname;
    if (first) return;

    if (popped.current) {
      popped.current = false;
      return;
    }

    if (!pushed.current) return;
    pushed.current = false;
    markPush();
  }, [pathname]);

  return null;
}
