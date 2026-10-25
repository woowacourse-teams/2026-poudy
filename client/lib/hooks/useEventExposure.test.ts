/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEventExposure } from "./useEventExposure";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
let notify: IntersectionObserverCallback;
function Target({ enabled = true }: { readonly enabled?: boolean }) {
  const ref = useEventExposure(
    "shelf_entry_viewed",
    { source: "about", placement: "primary", entry_view_id: "entry", auth_state: "signed_out" },
    { enabled },
  );
  return createElement("button", { ref }, "선반");
}
const visibility = (ratio: number) =>
  notify(
    [{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(track).mockClear();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});
describe("실제 노출", () => {
  it("짧게 스쳐 지나간 노출을 제외하고 충분히 보인 경우 한 번만 기록한다", () => {
    render(createElement(Target));
    act(() => {
      visibility(0.7);
      vi.advanceTimersByTime(400);
      visibility(0);
      vi.advanceTimersByTime(500);
    });
    expect(track).not.toHaveBeenCalled();
    act(() => {
      visibility(0.7);
      vi.advanceTimersByTime(500);
      visibility(1);
      vi.advanceTimersByTime(500);
    });
    expect(track).toHaveBeenCalledTimes(1);
  });
  it("탭이 숨겨진 동안에는 노출 시간에 더하지 않는다", () => {
    render(createElement(Target));
    act(() => {
      visibility(1);
      vi.advanceTimersByTime(300);
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(1000);
    });
    expect(track).not.toHaveBeenCalled();
  });
  it("도움말 등으로 가려진 상태는 계측하지 않고 해제된 뒤 관찰한다", () => {
    const view = render(createElement(Target, { enabled: false }));
    expect(track).not.toHaveBeenCalled();
    view.rerender(createElement(Target, { enabled: true }));
    act(() => {
      visibility(1);
      vi.advanceTimersByTime(500);
    });
    expect(track).toHaveBeenCalledTimes(1);
  });
});
