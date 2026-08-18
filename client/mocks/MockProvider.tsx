"use client";

import { useEffect, useState } from "react";

const enabled = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * 워커가 준비되기 전에 자식이 요청을 보내면 목을 거치지 않고 실제 네트워크로 나간다.
 * 그래서 시작이 끝날 때까지 자식을 렌더링하지 않는다.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    // 목을 끈 빌드에 MSW 가 딸려 들어가지 않도록 동적으로 불러온다.
    import("./browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .then(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return children;
}
