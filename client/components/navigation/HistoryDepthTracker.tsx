"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { markPop, markPush } from "@/lib/navigation/history-depth";

/** 화면 이동을 세어 둔다. 그려지는 것은 없다. */
export function HistoryDepthTracker() {
  const pathname = usePathname();
  const mounted = useRef(false);
  const popped = useRef(false);

  useEffect(() => {
    const handlePop = () => {
      popped.current = true;
      markPop();
    };

    window.addEventListener("popstate", handlePop);

    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    // 처음 그려질 때는 옮겨 온 것이 아니다.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    // 뒤로·앞으로는 popstate 가 이미 셈을 마쳤다.
    if (popped.current) {
      popped.current = false;
      return;
    }

    markPush();
  }, [pathname]);

  return null;
}
