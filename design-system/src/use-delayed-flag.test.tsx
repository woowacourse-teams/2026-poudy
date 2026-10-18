/**
 * @vitest-environment jsdom
 */
import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Skeleton } from "./skeleton";
import { useDelayedFlag, useSlowFlag } from "./use-delayed-flag";

describe("useDelayedFlag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("300ms 안에 끝나면 한 번도 켜지 않는다", () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), { initialProps: { flag: true } });
    act(() => vi.advanceTimersByTime(299));
    rerender({ flag: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it("300ms 가 지나면 켜고, 일찍 끝나도 최소 500ms 유지한다", () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), { initialProps: { flag: true } });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(100));
    rerender({ flag: false });
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("최소 시간을 넘겨 끝나면 바로 끈다", () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), { initialProps: { flag: true } });
    act(() => vi.advanceTimersByTime(1000));
    rerender({ flag: false });
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe(false);
  });

  it("유지하는 동안 다시 켜지면 끄지 않는다", () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), { initialProps: { flag: true } });
    act(() => vi.advanceTimersByTime(300));
    rerender({ flag: false });
    act(() => vi.advanceTimersByTime(100));
    rerender({ flag: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(true);
  });
});

describe("useSlowFlag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("10초 동안 이어지면 켜고, 끝나면 바로 끈다", () => {
    const { result, rerender } = renderHook(({ active }) => useSlowFlag(active), { initialProps: { active: true } });
    act(() => vi.advanceTimersByTime(9_999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(false);
  });
});

describe("Skeleton", () => {
  it("보조 기술에서 빼고, 글자 줄은 글자 크기만큼의 높이를 갖는다", () => {
    const { container } = render(<Skeleton shape="line" size={13} className="w-14" />);
    const line = container.firstElementChild!;
    expect(line).toHaveAttribute("aria-hidden", "true");
    expect(line).toHaveClass("h-3.25", "w-14", "rounded-xs", "bg-surface");
  });
});
