"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { markPop, markPush } from "@/lib/navigation/history-depth";

export function HistoryDepthTracker() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const popped = useRef(false);

  useEffect(() => {
    const handlePop = () => {
      popped.current = true;
      markPop();
    };

    window.addEventListener("popstate", handlePop);

    return () => window.removeEventListener("popstate", handlePop);
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

    markPush();
  }, [pathname]);

  return null;
}
