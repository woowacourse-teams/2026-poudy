/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useVisibleView } from "./useVisibleView";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track }));
let observe: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void;
function Content() {
  const { ref, record } = useVisibleView("mark_results_viewed", { mark_codes: ["VEGAN"], result_count: 0 }, "a");
  return (
    <div ref={ref}>
      <button onClick={record}>선택</button>
    </div>
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  track.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: typeof observe) {
        observe = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("화면에 0.5초 보인 콘텐츠만 한 번 기록한다", () => {
  render(<Content />);
  act(() => {
    observe([{ isIntersecting: true, intersectionRatio: 0.5 }]);
    vi.advanceTimersByTime(499);
  });
  expect(track).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  fireEvent.click(screen.getByText("선택"));
  expect(track).toHaveBeenCalledTimes(1);
});
it("빠른 선택도 기록하고 사라진 콘텐츠의 지연 노출은 기록하지 않는다", () => {
  const view = render(<Content />);
  fireEvent.click(screen.getByText("선택"));
  expect(track).toHaveBeenCalledTimes(1);
  track.mockClear();
  act(() => observe([{ isIntersecting: true, intersectionRatio: 0.5 }]));
  view.unmount();
  act(() => vi.advanceTimersByTime(500));
  expect(track).not.toHaveBeenCalled();
});
