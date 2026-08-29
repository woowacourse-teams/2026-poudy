"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { markPop, markPush } from "@/lib/navigation/history-depth";

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
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (popped.current) {
      popped.current = false;
      return;
    }

    markPush();
  }, [pathname]);

  return null;
}
