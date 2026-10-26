/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsProvider, pageOf } from "./AnalyticsProvider";

const mocks = vi.hoisted(() => ({
  ready: vi.fn(),
  start: vi.fn(() => ({ stop: vi.fn(), navigate: vi.fn() })),
  track: vi.fn(),
  pathname: "/",
}));
vi.mock("@/lib/api/member", () => ({ findMe: vi.fn(() => Promise.resolve({ id: 1 })) }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/lib/analytics/deferred-posthog", () => ({ afterAnalyticsReady: mocks.ready }));
vi.mock("./service-active-time", () => ({ startServiceActiveTime: mocks.start }));
vi.mock("@/lib/analytics/track", () => ({ track: mocks.track }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
  mocks.ready.mockReturnValue(vi.fn());
});

describe("AnalyticsProvider 측정 수명", () => {
  it("서버 렌더링에서는 준비 구독과 활성 시간 측정을 실행하지 않는다", () => {
    expect(renderToString(<AnalyticsProvider />)).toBe("");
    expect(mocks.ready).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("브라우저 commit과 SDK 준비 뒤에 시작하고 늦은 SDK에도 최신 경로를 쓴다", () => {
    const { rerender, unmount } = render(<AnalyticsProvider />);
    expect(mocks.ready).toHaveBeenCalledOnce();
    expect(mocks.start).not.toHaveBeenCalled();
    mocks.pathname = "/search";
    rerender(<AnalyticsProvider />);
    const client = { onSessionId: vi.fn(() => vi.fn()), get_session_id: vi.fn(() => "session") };
    mocks.ready.mock.calls[0][0](client);
    expect(mocks.start).toHaveBeenCalledWith(client, "/search");
    mocks.pathname = "/products/42";
    rerender(<AnalyticsProvider />);
    expect(mocks.start.mock.results[0].value.navigate).toHaveBeenCalledWith("/products/42");
    unmount();
    expect(mocks.start.mock.results[0].value.stop).toHaveBeenCalledOnce();
    expect(mocks.ready.mock.results[0].value).toHaveBeenCalledOnce();
    expect(mocks.track.mock.calls.map(([, properties]) => properties.page)).toEqual([
      "home",
      "search",
      "product_detail",
    ]);
  });

  it("SDK 준비 알림이 반복되면 이전 측정을 정리하고 unmount 때 현재 측정을 정리한다", () => {
    const { unmount } = render(<AnalyticsProvider />);
    const client = { onSessionId: vi.fn(() => vi.fn()), get_session_id: vi.fn(() => "session") };
    const ready = mocks.ready.mock.calls[0][0];
    ready(client);
    ready(client);
    const [first, second] = mocks.start.mock.results.map((result) => result.value);
    expect(first.stop).toHaveBeenCalledOnce();
    expect(second.stop).not.toHaveBeenCalled();
    unmount();
    expect(first.stop).toHaveBeenCalledOnce();
    expect(second.stop).toHaveBeenCalledOnce();
  });
});

describe("pageOf", () => {
  it("큐레이션 상세를 화면 이름으로 가른다", () => {
    expect(pageOf("/curations/1")).toBe("curation_detail");
  });

  it("성분군 설명을 화면 이름으로 가른다", () => {
    expect(pageOf("/ingredient-groups/CERAMIDES")).toBe("ingredient_group_detail");
  });

  it("서비스 소개를 화면 이름으로 가른다", () => {
    expect(pageOf("/about")).toBe("about");
  });

  it("큐레이션 상세 아래의 경로는 큐레이션 상세로 세지 않는다", () => {
    expect(pageOf("/curations/1/opengraph-image")).toBeUndefined();
  });
});
