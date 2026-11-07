/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterChipBar } from "./FilterChipBar";

const CHIPS = [
  { id: "ingredient", label: "성분" },
  { id: "category", label: "카테고리" },
] as const;

const mouse = { pointerId: 1, pointerType: "mouse", button: 0, buttons: 1 } as const;

/** jsdom 은 레이아웃이 없고 포인터 캡처도 갖추지 않아, 넘치는 줄을 직접 꾸민다. */
const renderBar = ({ scrollWidth = 600 } = {}) => {
  const onOpen = vi.fn();
  render(<FilterChipBar chips={CHIPS} onOpen={onOpen} />);

  const chip = screen.getByRole("button", { name: "카테고리" });
  const scroller = chip.closest<HTMLElement>(".overflow-x-auto");
  if (!scroller) throw new Error("스크롤 영역을 찾지 못했다");

  Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 390 });
  const setPointerCapture = vi.fn();
  scroller.setPointerCapture = setPointerCapture;
  // 칩은 뗀 자리가 자기 안인지 확인한 뒤에 클릭을 확정한다.
  chip.getBoundingClientRect = () => new DOMRect(0, 0, 300, 32);

  return { chip, scroller, onOpen, setPointerCapture };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("FilterChipBar 마우스 드래그", () => {
  it("칩 위에서 끌면 끈 거리만큼 줄이 움직이고, 뒤따르는 클릭은 시트를 열지 않는다", () => {
    const { chip, scroller, onOpen, setPointerCapture } = renderBar();
    scroller.scrollLeft = 100;

    fireEvent.pointerDown(chip, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(chip, { ...mouse, clientX: 140 });

    expect(scroller.scrollLeft).toBe(160);
    expect(setPointerCapture).toHaveBeenCalledWith(1);

    fireEvent.pointerUp(scroller, { ...mouse, buttons: 0, clientX: 140 });
    fireEvent.click(chip, { detail: 1 });

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("끌기 기준보다 적게 움직인 누름은 줄을 옮기지 않고 시트를 연다", () => {
    const { chip, scroller, onOpen, setPointerCapture } = renderBar();
    scroller.scrollLeft = 100;

    fireEvent.pointerDown(chip, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(chip, { ...mouse, clientX: 196 });
    fireEvent.pointerUp(chip, { ...mouse, buttons: 0, clientX: 196 });
    fireEvent.click(chip, { detail: 1 });

    expect(scroller.scrollLeft).toBe(100);
    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("category");
  });

  it("끌기를 끝낸 뒤 키보드로 누른 칩은 막지 않는다", () => {
    vi.useFakeTimers();
    const { chip, scroller, onOpen } = renderBar();

    fireEvent.pointerDown(chip, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(chip, { ...mouse, clientX: 140 });
    fireEvent.pointerUp(scroller, { ...mouse, buttons: 0, clientX: 140 });
    act(() => {
      vi.runAllTimers();
    });

    fireEvent.click(chip, { detail: 0 });

    expect(onOpen).toHaveBeenCalledExactlyOnceWith("category");
  });

  it("손가락으로 미는 동작은 브라우저에 맡긴다", () => {
    const { chip, scroller, setPointerCapture } = renderBar();
    const touch = { pointerId: 2, pointerType: "touch", button: 0, buttons: 1 };
    scroller.scrollLeft = 100;

    fireEvent.pointerDown(chip, { ...touch, clientX: 200 });
    fireEvent.pointerMove(chip, { ...touch, clientX: 140 });

    expect(scroller.scrollLeft).toBe(100);
    expect(setPointerCapture).not.toHaveBeenCalled();
  });

  it("왼쪽 버튼이 아니면 끌지 않는다", () => {
    const { chip, scroller } = renderBar();
    scroller.scrollLeft = 100;

    fireEvent.pointerDown(chip, { ...mouse, button: 2, buttons: 2, clientX: 200 });
    fireEvent.pointerMove(chip, { ...mouse, buttons: 2, clientX: 140 });

    expect(scroller.scrollLeft).toBe(100);
  });

  it("칩이 넘치지 않는 줄에서는 조금 움직인 누름도 시트를 연다", () => {
    const { chip, onOpen, setPointerCapture } = renderBar({ scrollWidth: 390 });

    fireEvent.pointerDown(chip, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(chip, { ...mouse, clientX: 192 });
    fireEvent.pointerUp(chip, { ...mouse, buttons: 0, clientX: 192 });
    fireEvent.click(chip, { detail: 1 });

    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("category");
  });

  it("버튼을 뗀 것을 듣지 못했으면 다음 움직임에서 끌기를 멈춘다", () => {
    const { chip, scroller } = renderBar();
    scroller.scrollLeft = 100;

    fireEvent.pointerDown(chip, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(chip, { ...mouse, buttons: 0, clientX: 140 });
    fireEvent.pointerMove(chip, { ...mouse, clientX: 100 });

    expect(scroller.scrollLeft).toBe(100);
  });
});
