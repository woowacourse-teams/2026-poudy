/**
 * @vitest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StatDial } from "./StatDial";

/** 다이얼이 실제로 보여 주는 숫자. 자리마다 밀어 올린 만큼을 읽는다. */
const shownDigits = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("[data-digit]")].map((digit) => digit.dataset.digit).join("");

let reveal: (() => void) | undefined;

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    reveal = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
  }
  observe() {}
  disconnect() {}
}

describe("StatDial", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  });

  afterEach(() => {
    reveal = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("처음에는 같은 자릿수의 0 으로 그리고, 보이면 실제 값으로 굴린다", () => {
    const { container } = render(<StatDial value={22013} />);

    expect(shownDigits(container)).toBe("00000");

    act(() => reveal?.());
    act(() => vi.advanceTimersByTime(200));

    expect(shownDigits(container)).toBe("22013");
  });

  it("낭독기에는 구르는 자리 대신 완성된 숫자를 전한다", () => {
    const { container } = render(<StatDial value={1240} />);

    expect(container.querySelector("[aria-hidden='true']")).toContainElement(
      container.querySelector("[data-digit]") as HTMLElement,
    );
    expect(screen.getByText("1,240")).toHaveClass("sr-only");
  });

  it("보이는지 알 수 없는 환경에서는 기다리지 않고 실제 값으로 맞춘다", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { container } = render(<StatDial value={39} />);
    act(() => vi.advanceTimersByTime(200));

    expect(shownDigits(container)).toBe("39");
  });
});
