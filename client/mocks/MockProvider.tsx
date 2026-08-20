"use client";

import { useEffect, useState } from "react";

const enabled = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * 개발 모드의 Strict Mode 는 effect 를 두 번 실행한다. 그때마다 start() 를 부르면
 * 이미 켜진 워커를 다시 설정하려다 실패한다. 시작을 한 번만 하도록 약속을 모듈에 둔다.
 */
let starting: Promise<unknown> | undefined;

const startWorker = () => {
  // 목을 끈 빌드에 MSW 가 딸려 들어가지 않도록 동적으로 불러온다.
  starting ??= import("./browser").then(({ worker }) =>
    worker.start({
      // 페이지가 부르는 청크와 그림까지 워커를 거친다. API 만 골라 알린다.
      onUnhandledRequest: (request, print) => {
        if (new URL(request.url).pathname.startsWith("/api/")) print.warning();
      },
    }),
  );
  return starting;
};

/**
 * 워커가 준비되기 전에 자식이 요청을 보내면 목을 거치지 않고 실제 네트워크로 나간다.
 * 그래서 시작이 끝날 때까지 자식을 렌더링하지 않는다.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    void startWorker().then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return children;
}
