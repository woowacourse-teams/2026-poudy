/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrackServiceActiveTime } from "./TrackServiceActiveTime";

const mocks = vi.hoisted(() => ({
  ready: vi.fn(),
  start: vi.fn(() => ({ stop: vi.fn(), navigate: vi.fn() })),
  pathname: "/",
}));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/lib/analytics/analytics-ready", () => ({ afterAnalyticsReady: mocks.ready }));
vi.mock("./service-active-time", () => ({ startServiceActiveTime: mocks.start }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
  mocks.ready.mockReturnValue(vi.fn());
});

describe("TrackServiceActiveTime", () => {
  it("서버 렌더링에서는 준비 구독과 활성 시간 측정을 실행하지 않는다", () => {
    expect(renderToString(<TrackServiceActiveTime />)).toBe("");
    expect(mocks.ready).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("브라우저 commit과 SDK 준비 뒤에 시작하고 늦은 SDK에도 최신 경로를 쓴다", () => {
    const { rerender, unmount } = render(<TrackServiceActiveTime />);
    expect(mocks.ready).toHaveBeenCalledOnce();
    expect(mocks.start).not.toHaveBeenCalled();
    mocks.pathname = "/search";
    rerender(<TrackServiceActiveTime />);
    const client = { onSessionId: vi.fn(() => vi.fn()) };
    const stop = mocks.ready.mock.calls[0][0](client);
    expect(mocks.start).toHaveBeenCalledWith(client, "/search");
    mocks.pathname = "/products/42";
    rerender(<TrackServiceActiveTime />);
    expect(mocks.start.mock.results[0].value.navigate).toHaveBeenCalledWith("/products/42");
    stop();
    unmount();
  });
});
