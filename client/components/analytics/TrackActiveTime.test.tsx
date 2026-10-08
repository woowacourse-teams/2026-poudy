/**
 * @vitest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HEARTBEAT_MS, TrackActiveTime } from "./TrackActiveTime";

const track = vi.fn();

vi.mock("@/lib/analytics/track", () => ({ track: (...args: unknown[]) => track(...args) }));

let visibility: DocumentVisibilityState = "visible";

const setVisibility = (next: DocumentVisibilityState) => {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
};

const recorded = () =>
  track.mock.calls.map(([, properties]) => properties as { active_seconds: number; flush_reason: string });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance", "Date"] });
  track.mockClear();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("TrackActiveTime", () => {
  it("30초마다 늘어난 활성 시간을 보낸다", () => {
    render(<TrackActiveTime pageType="product_detail" entityId={42} />);

    act(() => vi.advanceTimersByTime(HEARTBEAT_MS));
    window.dispatchEvent(new Event("pointerdown"));
    act(() => vi.advanceTimersByTime(HEARTBEAT_MS));

    expect(track).toHaveBeenCalledTimes(2);
    expect(track.mock.calls[0]).toEqual([
      "detail_active_time_recorded",
      {
        page_type: "product_detail",
        entity_id: 42,
        active_seconds: 30,
        elapsed_seconds: 30,
        max_scroll_percentage: expect.any(Number),
        flush_reason: "heartbeat",
      },
      { beacon: false },
    ]);
    expect(recorded()[1]).toMatchObject({ active_seconds: 30, elapsed_seconds: 60 });
  });

  it("입력이 없으면 60초 뒤로는 heartbeat 를 보내지 않는다", () => {
    render(<TrackActiveTime pageType="product_detail" entityId={42} />);

    act(() => vi.advanceTimersByTime(HEARTBEAT_MS * 4));

    expect(recorded().map((event) => event.active_seconds)).toEqual([30, 30]);
  });

  it("성분군 설명은 숫자 ID 대신 성분군 코드로 남긴다", () => {
    render(<TrackActiveTime pageType="ingredient_group_detail" entityCode="CERAMIDES" />);

    act(() => vi.advanceTimersByTime(HEARTBEAT_MS));

    expect(track.mock.calls[0]?.[1]).toMatchObject({ page_type: "ingredient_group_detail", entity_code: "CERAMIDES" });
    expect(track.mock.calls[0]?.[1]).not.toHaveProperty("entity_id");
  });

  it("탭이 가려지면 바로 비콘으로 보내고 가려진 동안은 세지 않는다", () => {
    render(<TrackActiveTime pageType="ingredient_detail" entityId={7} />);

    act(() => vi.advanceTimersByTime(12_000));
    setVisibility("hidden");
    act(() => vi.advanceTimersByTime(HEARTBEAT_MS * 2));

    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls[0]?.[1]).toMatchObject({
      page_type: "ingredient_detail",
      entity_id: 7,
      active_seconds: 12,
      flush_reason: "hidden",
    });
    expect(track.mock.calls[0]?.[2]).toEqual({ beacon: true });
  });

  it("다른 대상으로 옮기면 앞 대상의 시간을 보내고 새로 잰다", () => {
    const { rerender, unmount } = render(<TrackActiveTime pageType="product_detail" entityId={1} />);

    act(() => vi.advanceTimersByTime(5_000));
    window.history.pushState(null, "", "/products/2");
    rerender(<TrackActiveTime pageType="product_detail" entityId={2} />);
    act(() => vi.advanceTimersByTime(3_000));
    unmount();

    expect(track.mock.calls.map(([, properties]) => properties)).toEqual([
      expect.objectContaining({ entity_id: 1, active_seconds: 5, flush_reason: "route_change" }),
      expect.objectContaining({ entity_id: 2, active_seconds: 3, flush_reason: "unmount" }),
    ]);
  });

  it("pagehide 뒤 곧바로 떠나도 이미 보낸 시간을 다시 보내지 않는다", () => {
    const { unmount } = render(<TrackActiveTime pageType="product_detail" entityId={42} />);

    act(() => vi.advanceTimersByTime(8_000));
    setVisibility("hidden");
    window.dispatchEvent(new Event("pagehide"));
    unmount();

    expect(recorded()).toEqual([expect.objectContaining({ active_seconds: 8, flush_reason: "hidden" })]);
  });

  it("빠르게 다시 들어와도 앞 방문의 시간을 겹쳐 세지 않는다", () => {
    const first = render(<TrackActiveTime pageType="product_detail" entityId={42} />);
    act(() => vi.advanceTimersByTime(4_000));
    first.unmount();

    const second = render(<TrackActiveTime pageType="product_detail" entityId={42} />);
    act(() => vi.advanceTimersByTime(2_000));
    second.unmount();

    expect(recorded().map((event) => event.active_seconds)).toEqual([4, 2]);
  });
});
