/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDragScroll } from "./use-drag-scroll";

const mouse = { pointerId: 1, pointerType: "mouse", button: 0, buttons: 1 } as const;

function Row() {
  const dragScroll = useDragScroll();
  return (
    <ul {...dragScroll} aria-label="줄" className="overflow-x-auto">
      <li>
        <a href="#item">제품</a>
      </li>
    </ul>
  );
}

/** jsdom 은 레이아웃이 없고 포인터 캡처도 갖추지 않아, 넘치는 줄을 직접 꾸민다. */
const overflow = (scroller: HTMLElement) => {
  Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: 600 });
  Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 390 });
  scroller.setPointerCapture = vi.fn();
};

describe("useDragScroll", () => {
  it("밀 줄에서는 링크를 집어 들지 않는다", () => {
    render(<Row />);
    overflow(screen.getByRole("list", { name: "줄" }));
    const link = screen.getByRole("link", { name: "제품" });

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });

    expect(fireEvent.dragStart(link)).toBe(false);
  });
});
