/**
 * @vitest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AboutReveal } from "./AboutReveal";

type Callback = (entries: { isIntersecting: boolean; target: Element }[]) => void;

let notify: Callback | undefined;
const observed: Element[] = [];
const unobserved: Element[] = [];

class FakeIntersectionObserver {
  constructor(callback: Callback) {
    notify = callback;
  }
  observe(target: Element) {
    observed.push(target);
  }
  unobserve(target: Element) {
    unobserved.push(target);
  }
  disconnect() {}
}

/** 칸의 위치를 세워 둔다. jsdom 은 모든 요소를 0 에 둔다. */
const placeAt = (element: HTMLElement, top: number) => {
  element.getBoundingClientRect = () => ({ top }) as DOMRect;
};

const renderWithTargets = () =>
  render(
    <>
      <p data-about-reveal="0">위 칸</p>
      <p data-about-reveal="1">아래 칸</p>
    </>,
  );

describe("AboutReveal", () => {
  afterEach(() => {
    notify = undefined;
    observed.length = 0;
    unobserved.length = 0;
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-about-reveal-ready");
  });

  it("시작할 때 이미 보이는 칸은 숨기지 않고, 아래 칸만 화면에 들어올 때 드러낸다", () => {
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    const { getByText, rerender } = renderWithTargets();
    const above = getByText("위 칸");
    const below = getByText("아래 칸");
    placeAt(above, 100);
    placeAt(below, window.innerHeight + 200);

    rerender(
      <>
        <p data-about-reveal="0">위 칸</p>
        <p data-about-reveal="1">아래 칸</p>
        <AboutReveal />
      </>,
    );

    expect(above).toHaveAttribute("data-revealed");
    expect(below).not.toHaveAttribute("data-revealed");
    expect(observed).toEqual([below]);
    expect(document.documentElement).toHaveAttribute("data-about-reveal-ready");

    act(() => notify?.([{ isIntersecting: true, target: below }]));

    expect(below).toHaveAttribute("data-revealed");
    expect(unobserved).toEqual([below]);
  });

  it("다른 화면으로 가면 숨김 규칙을 걷는다", () => {
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    const { unmount } = render(<AboutReveal />);

    unmount();

    expect(document.documentElement).not.toHaveAttribute("data-about-reveal-ready");
  });

  it("보이는지 알 수 없는 환경에서는 숨기지 않는다", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<AboutReveal />);

    expect(document.documentElement).not.toHaveAttribute("data-about-reveal-ready");
  });
});
