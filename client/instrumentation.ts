export async function register() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
  // msw/node 는 Node 런타임에서만 동작한다. Edge 런타임에서는 건너뛴다.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // 목을 끈 빌드에 MSW 가 딸려 들어가지 않도록 동적으로 불러온다.
  const { server } = await import("./mocks/server");
  server.listen({ onUnhandledRequest: "bypass" });
}
