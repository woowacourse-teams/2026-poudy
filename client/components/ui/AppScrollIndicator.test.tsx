/**
 * @vitest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppScrollIndicator } from "./AppScrollIndicator";

vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
}));

class NoopResizeObserver {
  observe() {}
  disconnect() {}
}

const setDocumentHeight = (scrollHeight: number, clientHeight: number) => {
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: clientHeight });
};

const setScrollTimelineSupport = (supported: boolean) => {
  vi.stubGlobal("CSS", { supports: () => supported });
};

const scrollTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  window.dispatchEvent(new Event("scroll"));
};

const thumb = (container: HTMLElement) => container.querySelector<HTMLElement>(".app-scroll-thumb");

describe("앱 WebView 스크롤 막대", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    setScrollTimelineSupport(true);
    setDocumentHeight(2000, 800);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    window.__POUDY_WEB_SCROLL_INDICATOR__ = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete window.__POUDY_WEB_SCROLL_INDICATOR__;
    scrollTo(0);
  });

  /* 네이티브 막대를 끄지 않은 예전 앱이나 브라우저에서 그리면 막대가 둘이 된다. */
  it("앱이 네이티브 막대를 껐다고 알리지 않으면 그리지 않는다", () => {
    delete window.__POUDY_WEB_SCROLL_INDICATOR__;

    const { container } = render(<AppScrollIndicator />);

    expect(thumb(container)).toBeNull();
  });

  it("스크롤하면 나타나고 스크롤이 멎은 뒤 사라진다", () => {
    const { container } = render(<AppScrollIndicator />);
    expect(thumb(container)).toHaveAttribute("data-visible", "false");

    act(() => scrollTo(300));
    expect(thumb(container)).toHaveAttribute("data-visible", "true");

    act(() => {
      window.dispatchEvent(new Event("scrollend"));
      vi.advanceTimersByTime(800);
    });
    expect(thumb(container)).toHaveAttribute("data-visible", "false");
  });

  it("스크롤할 거리가 없으면 나타나지 않는다", () => {
    setDocumentHeight(800, 800);
    const { container } = render(<AppScrollIndicator />);

    act(() => scrollTo(10));

    expect(thumb(container)).toHaveAttribute("data-visible", "false");
  });

  /* 위치는 CSS 스크롤 타임라인이 옮긴다. JS 는 이동 거리만 넘긴다. */
  it("스크롤 타임라인이 있으면 이동 거리만 넘기고 위치는 직접 옮기지 않는다", () => {
    const { container } = render(<AppScrollIndicator />);

    act(() => scrollTo(600));

    expect(thumb(container)?.style.getPropertyValue("--app-scroll-travel")).toBe("480px");
    expect(thumb(container)?.style.transform).toBe("");
  });

  it("스크롤 타임라인이 없으면 스크롤 위치에 맞춰 직접 옮긴다", () => {
    setScrollTimelineSupport(false);
    const { container } = render(<AppScrollIndicator />);

    act(() => scrollTo(600));

    expect(thumb(container)?.style.transform).toBe("translateY(240px)");
  });
});
