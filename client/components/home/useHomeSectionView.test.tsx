/** @vitest-environment jsdom */

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { HOME_PAGE_VERSION } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

let notify: IntersectionObserverCallback;
const disconnect = vi.fn();

function Section() {
  const ref = useHomeSectionView("skin_types", 3);
  return <section ref={ref}>피부 타입</section>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(track).mockClear();
  disconnect.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const show = (ratio: number) =>
  notify(
    [{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );

it("절반 이상 0.5초 보인 섹션을 한 번만 기록한다", () => {
  render(<Section />);

  act(() => show(0.5));
  act(() => vi.advanceTimersByTime(499));
  expect(track).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(1));
  expect(track).toHaveBeenCalledWith("home_section_viewed", {
    section: "skin_types",
    position: 3,
    page_version: HOME_PAGE_VERSION,
  });

  act(() => show(1));
  act(() => vi.advanceTimersByTime(500));
  expect(track).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalled();
});

it("노출 시간이 차기 전에 화면에서 벗어나면 기록하지 않는다", () => {
  render(<Section />);

  act(() => show(0.7));
  act(() => vi.advanceTimersByTime(300));
  act(() => show(0));
  act(() => vi.advanceTimersByTime(500));

  expect(track).not.toHaveBeenCalled();
});
