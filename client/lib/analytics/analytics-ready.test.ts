import { describe, expect, it, vi } from "vitest";

describe("afterAnalyticsReady", () => {
  it("SDK를 직접 로드하지 않고 준비 알림을 기다리며 구독 해제 때 측정도 정리한다", async () => {
    vi.resetModules();
    const { afterAnalyticsReady, analyticsReady } = await import("./analytics-ready");
    const stop = vi.fn();
    const start = vi.fn(() => stop);
    const unsubscribe = afterAnalyticsReady(start);
    expect(start).not.toHaveBeenCalled();
    const client = { onSessionId: vi.fn(() => vi.fn()) };
    analyticsReady(client);
    expect(start).toHaveBeenCalledWith(client);
    unsubscribe();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("준비 전에 해제한 effect는 나중에 SDK가 로드돼도 실행하지 않는다", async () => {
    vi.resetModules();
    const { afterAnalyticsReady, analyticsReady } = await import("./analytics-ready");
    const start = vi.fn(() => vi.fn());
    afterAnalyticsReady(start)();
    analyticsReady({ onSessionId: vi.fn(() => vi.fn()) });
    expect(start).not.toHaveBeenCalled();
  });
});
