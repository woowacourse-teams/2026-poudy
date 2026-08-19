import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
  // msw/node 는 Node 런타임에서만 동작한다. Edge 런타임에서는 건너뛴다.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // 목을 끈 빌드에 MSW 가 딸려 들어가지 않도록 동적으로 불러온다.
  const { server } = await import("./mocks/server");
  // 목이 잡지 못한 API 요청은 실제 네트워크로 새어 나가 404 가 된다.
  // 조용히 지나가면 원인을 찾기 어려우므로 로그를 남긴다.
  server.listen({
    onUnhandledRequest: (request, print) => {
      if (new URL(request.url).pathname.startsWith("/api/")) print.warning();
    },
  });
}

/**
 * 서버에서 일어난 오류를 남긴다.
 *
 * 화면의 track 은 브라우저의 window.posthog 를 쓰므로 서버 렌더링 실패를 잡지 못한다.
 * 서버 컴포넌트가 무너지면 사용자는 오류 화면을 보지만 분석 도구에는 아무것도 남지 않는다.
 * 그 빈자리를 이 함수가 메운다.
 *
 * PostHog 에 직접 보내지 않고 journal 로 남긴다. 서버에서 SDK 를 띄우면 브라우저와 다른
 * 세션으로 잡혀 사람 단위 분석이 어긋나고, 배포는 systemd 로 로그를 이미 모으고 있다.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;

  console.error(
    JSON.stringify({
      kind: "server_error",
      // digest 로 브라우저가 보여 준 오류 코드와 이 로그를 맞춘다.
      digest,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      path: request.path,
      method: request.method,
      route_path: context.routePath,
      route_type: context.routeType,
      render_source: context.renderSource,
      at: new Date().toISOString(),
    }),
  );
};
