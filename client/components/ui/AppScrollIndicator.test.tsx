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

const scrollTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  window.dispatchEvent(new Event("scroll"));
};

const thumb = (container: HTMLElement) => container.querySelector<HTMLElement>(".app-scroll-thumb");
const track = (container: HTMLElement) => container.querySelector<HTMLElement>(".app-scroll-track");

/** 화면 위에 붙은 줄을 흉내 낸다. jsdom 은 자리를 재지 않으므로 잰 값을 직접 준다. */
const addStickyBar = ({
  top,
  rectTop,
  bottom,
  hidden = false,
}: {
  top: number;
  rectTop: number;
  bottom: number;
  hidden?: boolean;
}) => {
  const bar = document.createElement("div");
  bar.className = "sticky";
  bar.style.top = `${top}px`;
  if (hidden) bar.style.opacity = "0";
  bar.getBoundingClientRect = () => ({ top: rectTop, bottom, height: bottom - rectTop }) as DOMRect;
  document.body.append(bar);
  return bar;
};

describe("앱 WebView 스크롤 막대", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    setDocumentHeight(2000, 800);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    window.__POUDY_WEB_SCROLL_INDICATOR__ = true;
  });

  afterEach(() => {
    document.querySelectorAll(".sticky").forEach((bar) => bar.remove());
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

  /* 칩 줄처럼 상단바 아래에 붙은 줄이 있으면 그 아래부터 오간다. 줄 위로 막대가 지나가지 않게 한다. */
  it("화면 위에 붙은 줄들 가운데 가장 아래 끝부터 트랙을 시작한다", () => {
    addStickyBar({ top: 0, rectTop: 0, bottom: 44 });
    addStickyBar({ top: 44, rectTop: 44, bottom: 100 });
    const { container } = render(<AppScrollIndicator />);

    expect(track(container)?.style.top).toBe("100px");
  });

  /* 아직 흐름 안에 있는 줄은 붙은 것이 아니다. 붙기 전 투명하게 자리를 지키는 줄도 뺀다. */
  it("아직 붙지 않았거나 보이지 않는 줄은 트랙 시작에서 뺀다", () => {
    addStickyBar({ top: 0, rectTop: 0, bottom: 44 });
    addStickyBar({ top: 44, rectTop: 300, bottom: 356 });
    addStickyBar({ top: 44, rectTop: 44, bottom: 100, hidden: true });
    const { container } = render(<AppScrollIndicator />);

    expect(track(container)?.style.top).toBe("44px");
  });

  /* 맨 위에서는 칩 줄이 아직 흐름 안에 있지만 머리 바로 아래에 이어져 있어 머리로 본다. */
  it("머리 바로 아래에 이어진 줄은 붙기 전이어도 트랙 시작에 넣는다", () => {
    addStickyBar({ top: 0, rectTop: 0, bottom: 56 });
    addStickyBar({ top: 56, rectTop: 56, bottom: 112 });
    addStickyBar({ top: 112, rectTop: 120, bottom: 176 });
    const { container } = render(<AppScrollIndicator />);

    expect(track(container)?.style.top).toBe("176px");
  });

  /* 스크롤 타임라인은 Android WebView 의 스크롤을 버벅이게 해 쓰지 않는다. */
  it("스크롤 위치에 맞춰 직접 옮긴다", () => {
    const { container } = render(<AppScrollIndicator />);

    act(() => scrollTo(600));

    expect(thumb(container)?.style.transform).toBe("translateY(240px)");
  });
});
