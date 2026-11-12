/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShelfFeatureSheet } from "./ShelfFeatureSheet";

let reduced = false;
let change: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: (_: string, fn: () => void) => {
        change = fn;
      },
      removeEventListener: () => {
        change = undefined;
      },
    })),
  );
  vi.stubGlobal("PointerEvent", MouseEvent);
  Element.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const elapse = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const current = (n: number) =>
  expect(screen.getByRole("button", { name: `${n}단계로` })).toHaveAttribute("aria-current", "step");
const viewport = () => screen.getByRole("region", { name: "파우치 사용법 단계" }).querySelector('[class*="viewport"]')!;
const down = () => fireEvent.pointerDown(viewport(), { button: 0, clientX: 180, clientY: 100 });
const up = (x = 180) => fireEvent.pointerUp(viewport(), { clientX: x, clientY: 100 });
describe("파우치 사용법", () => {
  it("5단계를 재생하고 마지막 장면만 반복한다", () => {
    render(<ShelfFeatureSheet open onClose={vi.fn()} />);
    current(1);
    elapse(3560);
    current(2);
    elapse(2930);
    current(3);
    elapse(3330);
    current(4);
    elapse(2930);
    current(5);
    elapse(1600);
    expect(document.querySelector('[data-guide-id="n4"]')).toHaveTextContent("152");
    elapse(1290);
    current(5);
    expect(document.querySelector('[data-guide-id="n4"]')).toHaveTextContent("299");
  });
  it("찾은 성분을 고르고 필터에 추가하는 과정을 검색 전에 보여 준다", () => {
    render(<ShelfFeatureSheet open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "4단계로" }));
    current(4);
    elapse(1400);
    expect(document.querySelector('[data-guide-id="add-filter"]')).toHaveTextContent("성분 3개 추가하기");
    elapse(300);
    expect(document.querySelector('[data-guide-scene="4"]')).toHaveAttribute("data-guide-phase", "added");
    expect(document.querySelector('[class*="toast"]')).toHaveTextContent("성분 3개를 나만의 필터에 넣었어요");
    elapse(1230);
    current(5);
  });
  it("수동 이동하면 이전 장면의 종료 시점에 넘어가지 않는다", () => {
    render(<ShelfFeatureSheet open onClose={vi.fn()} />);
    elapse(2000);
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
    elapse(2000);
    current(2);
    elapse(929);
    current(2);
    elapse(1);
    current(3);
  });
  it("드래그 중 재생이 끝나도 놓을 때까지 기다리고 한 단계만 이동한다", () => {
    render(<ShelfFeatureSheet open onClose={vi.fn()} />);
    down();
    elapse(4200);
    current(1);
    up(90);
    current(2);
    elapse(2929);
    current(2);
    elapse(1);
    current(3);
  });
  it("드래그 없이 놓거나 취소해도 자동 넘김이 영구히 막히지 않는다", () => {
    render(<ShelfFeatureSheet open onClose={vi.fn()} />);
    down();
    elapse(4100);
    current(1);
    up();
    current(2);
    down();
    elapse(3800);
    current(2);
    fireEvent.pointerCancel(viewport());
    current(3);
  });
  it("움직임 줄이기에서는 자동으로 넘기지 않고 설정 변경을 반영한다", () => {
    reduced = true;
    render(<ShelfFeatureSheet open onClose={vi.fn()} />);
    elapse(10000);
    current(1);
    fireEvent.click(screen.getByRole("button", { name: "4단계로" }));
    elapse(10000);
    current(4);
    act(() => {
      reduced = false;
      change?.();
    });
    elapse(3000);
    current(5);
  });
  it("닫기와 방향키를 지원하고 다시 열면 1단계부터 시작한다", () => {
    const close = vi.fn();
    const view = render(<ShelfFeatureSheet open onClose={close} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "1단계로" }), { key: "ArrowRight" });
    current(2);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(close).toHaveBeenCalledOnce();
    view.rerender(<ShelfFeatureSheet open={false} onClose={close} />);
    elapse(10000);
    view.rerender(<ShelfFeatureSheet open onClose={close} />);
    current(1);
  });
  it("탭이 숨겨지면 재생을 중지하고 다시 보일 때 현재 단계를 재시작한다", () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const view = render(<ShelfFeatureSheet open onClose={vi.fn()} />);
    elapse(1000);
    act(() => {
      visibility.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(document.querySelector("[data-guide-scene]")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    elapse(10000);
    current(1);
    act(() => {
      visibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(document.querySelector("[data-guide-scene]")).not.toBeNull();
    elapse(3559);
    current(1);
    elapse(1);
    current(2);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("닫기 전환 동안 화면을 유지하고 전환이 끝나면 제거한다", () => {
    const close = vi.fn();
    const view = render(<ShelfFeatureSheet open onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "4단계로" }));
    view.rerender(<ShelfFeatureSheet open={false} onClose={close} />);
    expect(document.querySelector('[data-guide-scene="4"]')).toHaveAttribute("data-active", "false");
    elapse(400);
    expect(document.querySelector("[data-guide-scene]")).toBeNull();
  });
  it("닫는 도중 바로 다시 열어도 1단계로 초기화한다", () => {
    const close = vi.fn();
    const view = render(<ShelfFeatureSheet open onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "4단계로" }));
    view.rerender(<ShelfFeatureSheet open={false} onClose={close} />);
    view.rerender(<ShelfFeatureSheet open onClose={close} />);
    current(1);
  });
});
