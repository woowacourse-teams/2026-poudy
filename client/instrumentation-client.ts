import { initAnalytics } from "./lib/analytics/track";

initAnalytics();

/**
 * 목 워커를 화면보다 먼저 띄운다. 이 파일은 앱이 하이드레이션되기 전에 실행되므로
 * 자식이 첫 요청을 보낼 때 워커가 이미 자리를 잡고 있다. 서버 쪽에서
 * instrumentation.ts 가 목 서버를 띄우는 것과 같은 자리다.
 */
if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
  // 목을 끈 빌드에 MSW 가 딸려 들어가지 않도록 동적으로 불러온다.
  await import("./mocks/browser").then(({ worker }) =>
    worker.start({
      // 페이지가 부르는 청크와 그림까지 워커를 거친다. API 만 골라 알린다.
      onUnhandledRequest: (request, print) => {
        if (new URL(request.url).pathname.startsWith("/api/")) print.warning();
      },
    }),
  );
}
