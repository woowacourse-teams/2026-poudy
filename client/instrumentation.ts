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
