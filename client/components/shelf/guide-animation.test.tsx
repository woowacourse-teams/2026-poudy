/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShelfGuideScene } from "./ShelfGuideScene";

afterEach(() => vi.useRealTimers());
beforeEach(() => vi.useFakeTimers());
const elapse = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("파우치 애니메이션 자원 정리", () => {
  it.each([0, 1, 2, 3, 4])("%i번 장면을 중간에 제거하면 모든 예약을 취소한다", (step) => {
    const complete = vi.fn();
    const view = render(
      <StrictMode>
        <ShelfGuideScene step={step} reduced={false} onComplete={complete} />
      </StrictMode>,
    );
    elapse(1900);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    elapse(60000);
    expect(complete).not.toHaveBeenCalled();
  });

  it("마지막 장면을 오래 반복해도 대기 중인 예약 수가 늘어나지 않는다", () => {
    const complete = vi.fn();
    const view = render(<ShelfGuideScene step={4} reduced={false} onComplete={complete} />);
    const firstCycle = vi.getTimerCount();
    for (let i = 0; i < 60; i++) {
      elapse(3250);
      expect(vi.getTimerCount()).toBe(firstCycle);
    }
    expect(complete).not.toHaveBeenCalled();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("움직임 줄이기에서는 예약을 만들지 않는다", () => {
    render(<ShelfGuideScene step={2} reduced onComplete={vi.fn()} />);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("닫는 전환에서는 마지막 DOM을 유지하면서 타이머만 즉시 정리한다", () => {
    const complete = vi.fn();
    const view = render(<ShelfGuideScene step={1} reduced={false} onComplete={complete} />);
    elapse(1500);
    view.rerender(<ShelfGuideScene step={1} reduced={false} active={false} onComplete={complete} />);
    const root = view.container.querySelector("[data-guide-scene]")!;
    const markup = root.innerHTML;
    expect(root).toHaveAttribute("data-active", "false");
    expect(vi.getTimerCount()).toBe(0);
    elapse(10000);
    expect(root.innerHTML).toBe(markup);
    expect(complete).not.toHaveBeenCalled();
  });
});
