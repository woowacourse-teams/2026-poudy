/**
 * @vitest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScreenStickyRow } from "./screen";

type ObserverCallback = (entries: readonly unknown[]) => void;

/** IntersectionObserver 를 흉내 낸다. 받은 rootMargin 을 남기고, 표식이 붙는 높이를 지났다고 알릴 수 있다. */
const observers: { callback: ObserverCallback; rootMargin?: string }[] = [];
const passTop = (passed: boolean) =>
  act(() => {
    for (const { callback } of observers)
      callback([{ boundingClientRect: { top: passed ? 63 : 64 }, rootBounds: { top: 64 } }]);
  });

describe("ScreenStickyRow", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
          observers.push({ callback, rootMargin: options?.rootMargin });
        }
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("위 내비(큰 제목 64) 바로 아래에 붙고, 표식이 그 높이 위로 지나간 동안에만 붙은 것으로 표시한다", () => {
    render(
      <ScreenStickyRow below="large">
        보기 필터
      </ScreenStickyRow>,
    );
    const row = screen.getByText("보기 필터");

    expect(observers[0]?.rootMargin).toBe("-64px 0px 0px 0px");
    expect(row).toHaveClass("sticky", "top-16");
    expect(row).not.toHaveAttribute("data-stuck");

    passTop(true);
    expect(row).toHaveAttribute("data-stuck", "");

    passTop(false);
    expect(row).not.toHaveAttribute("data-stuck");
  });
});
