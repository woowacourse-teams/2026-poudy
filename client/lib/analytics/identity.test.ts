/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  delete window.posthog;
});
const load = async () => {
  vi.resetModules();
  window.posthog = {
    capture: vi.fn(),
    captureException: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    register: vi.fn(),
  };
  return import("./identity");
};
describe("분석용 회원 식별", () => {
  it("이메일 없이 내부 회원 번호로 연결하고 같은 클라이언트의 중복 식별을 생략한다", async () => {
    const identity = await load();
    identity.identifyAnalyticsMember(1);
    identity.identifyAnalyticsMember(1);
    expect(window.posthog?.identify).toHaveBeenCalledExactlyOnceWith("member:1");
    expect(identity.analyticsAuthState()).toBe("signed_in");
  });
  it("계정이 바뀌면 이전 식별을 먼저 초기화하고 앱 속성을 다시 등록한다", async () => {
    const identity = await load();
    identity.identifyAnalyticsMember(1);
    identity.identifyAnalyticsMember(2);
    expect(window.posthog?.reset).toHaveBeenCalledOnce();
    expect(window.posthog?.identify).toHaveBeenLastCalledWith("member:2");
    expect(window.posthog?.register).toHaveBeenLastCalledWith({ is_app: false });
  });
  it("로그아웃보다 늦게 도착한 이전 회원 응답으로 재식별하지 않는다", async () => {
    const identity = await load();
    identity.identifyAnalyticsMember(1);
    const revision = identity.analyticsIdentityRevision();
    identity.resetAnalyticsIdentity();
    identity.identifyAnalyticsMember(1, revision);
    expect(identity.analyticsAuthState()).toBe("signed_out");
    expect(window.posthog?.identify).toHaveBeenCalledOnce();
  });
});
