/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Tab, TabLabel, TabList, Tabs } from "./tabs";
import { useDragScroll } from "./use-drag-scroll";

const mouse = {
  pointerId: 1,
  pointerType: "mouse",
  button: 0,
  buttons: 1,
} as const;

/** 줄 두 개가 훅 하나를 나눠 쓴다(유튜버 상세의 영상별 제품 줄). */
function Rows({ onPick }: { readonly onPick: (name: string) => void }) {
  const dragScroll = useDragScroll();
  return (
    <>
      {["첫째", "둘째"].map((row) => (
        <ul
          key={row}
          {...dragScroll}
          aria-label={row}
          className="overflow-x-auto"
        >
          <li>
            <a href={`#${row}`} onClick={() => onPick(row)}>
              {row} 제품
            </a>
          </li>
        </ul>
      ))}
    </>
  );
}

/** jsdom 은 레이아웃이 없고 포인터 캡처도 갖추지 않아, 넘치는 줄을 직접 꾸민다. */
const overflow = (scroller: HTMLElement, { scrollWidth = 600 } = {}) => {
  Object.defineProperty(scroller, "scrollWidth", {
    configurable: true,
    value: scrollWidth,
  });
  Object.defineProperty(scroller, "clientWidth", {
    configurable: true,
    value: 390,
  });
  const setPointerCapture = vi.fn();
  scroller.setPointerCapture = setPointerCapture;
  return setPointerCapture;
};

const renderRows = () => {
  const onPick = vi.fn();
  render(<Rows onPick={onPick} />);
  const first = screen.getByRole("list", { name: "첫째" });
  const second = screen.getByRole("list", { name: "둘째" });
  const capture = overflow(first);
  overflow(second);
  return {
    onPick,
    first,
    second,
    capture,
    link: screen.getByRole("link", { name: "첫째 제품" }),
  };
};

describe("useDragScroll", () => {
  it("끈 거리만큼 줄을 밀고, 뒤따르는 클릭은 링크로 넘기지 않는다", () => {
    const { onPick, first, capture, link } = renderRows();
    first.scrollLeft = 100;

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(link, { ...mouse, clientX: 140 });

    expect(first.scrollLeft).toBe(160);
    expect(capture).toHaveBeenCalledWith(1);

    fireEvent.pointerUp(first, { ...mouse, buttons: 0, clientX: 140 });
    const passed = fireEvent.click(link, { detail: 1 });

    expect(onPick).not.toHaveBeenCalled();
    // 링크의 이동도 막는다.
    expect(passed).toBe(false);
  });

  it("끌지 않은 누름은 줄을 옮기지 않고 링크로 넘긴다", () => {
    const { onPick, first, capture, link } = renderRows();
    first.scrollLeft = 100;

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(link, { ...mouse, clientX: 197 });
    fireEvent.pointerUp(link, { ...mouse, buttons: 0, clientX: 197 });
    fireEvent.click(link, { detail: 1 });

    expect(first.scrollLeft).toBe(100);
    expect(capture).not.toHaveBeenCalled();
    expect(onPick).toHaveBeenCalledWith("첫째");
  });

  it("끈 뒤 한 번만 막는다. 다음 누름은 링크로 넘긴다", async () => {
    const { onPick, first, link } = renderRows();

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(link, { ...mouse, clientX: 140 });
    fireEvent.pointerUp(first, { ...mouse, buttons: 0, clientX: 140 });
    fireEvent.click(link, { detail: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.pointerDown(link, { ...mouse, clientX: 140 });
    fireEvent.pointerUp(link, { ...mouse, buttons: 0, clientX: 140 });
    fireEvent.click(link, { detail: 1 });

    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("누른 줄만 민다. 끄는 사이 다른 줄 위로 지나가도 그 줄은 그대로다", () => {
    const { first, second, link } = renderRows();
    first.scrollLeft = 100;
    second.scrollLeft = 50;

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(second, { ...mouse, clientX: 150 });

    expect(first.scrollLeft).toBe(150);
    expect(second.scrollLeft).toBe(50);
  });

  it("손가락으로 민 것은 브라우저에 맡긴다", () => {
    const { onPick, first, capture, link } = renderRows();
    const touch = { ...mouse, pointerId: 2, pointerType: "touch" };

    fireEvent.pointerDown(link, { ...touch, clientX: 200 });
    fireEvent.pointerMove(link, { ...touch, clientX: 140 });
    fireEvent.pointerUp(link, { ...touch, buttons: 0, clientX: 140 });
    fireEvent.click(link, { detail: 1 });

    expect(first.scrollLeft).toBe(0);
    expect(capture).not.toHaveBeenCalled();
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("밀 것이 없는 줄은 끌기로 받지 않는다", () => {
    const { onPick, first, capture, link } = renderRows();
    overflow(first, { scrollWidth: 390 });

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(link, { ...mouse, clientX: 140 });
    fireEvent.pointerUp(link, { ...mouse, buttons: 0, clientX: 140 });
    fireEvent.click(link, { detail: 1 });

    expect(capture).not.toHaveBeenCalled();
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("가로 넘침을 감춘 줄은 넘쳐도 밀지 않는다", () => {
    const { first, capture, link } = renderRows();
    first.style.overflowX = "hidden";

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(link, { ...mouse, clientX: 140 });

    expect(first.scrollLeft).toBe(0);
    expect(capture).not.toHaveBeenCalled();
  });

  it("끄는 동안 스냅을 끄고, 놓으면 돌려 놓는다", () => {
    const { first, link } = renderRows();
    first.style.scrollSnapType = "x mandatory";

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(link, { ...mouse, clientX: 140 });
    expect(first.style.scrollSnapType).toBe("none");

    fireEvent.pointerUp(first, { ...mouse, buttons: 0, clientX: 140 });
    expect(first.style.scrollSnapType).toBe("x mandatory");
  });

  it("끌기가 끊겨도 스냅을 돌려 놓는다", () => {
    const { first, link } = renderRows();
    first.style.scrollSnapType = "x mandatory";

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(link, { ...mouse, clientX: 140 });
    fireEvent.pointerCancel(first, { ...mouse });

    expect(first.style.scrollSnapType).toBe("x mandatory");
  });

  it("밀 줄에서는 링크를 집어 들지 않는다", () => {
    const { link } = renderRows();

    fireEvent.pointerDown(link, { ...mouse, clientX: 200 });

    expect(fireEvent.dragStart(link)).toBe(false);
  });
});

describe("Tabs 가로 트랙", () => {
  it("넘치는 탭 줄을 끌면 밀리고, 뒤따르는 클릭은 탭을 고르지 않는다", () => {
    const onValueChange = vi.fn();
    render(
      <Tabs value="a" onValueChange={onValueChange} layout="scroll">
        <TabList label="카테고리">
          {["a", "b"].map((value) => (
            <Tab key={value} value={value}>
              <TabLabel>{value}</TabLabel>
            </Tab>
          ))}
        </TabList>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    overflow(list);
    const tab = screen.getByRole("tab", { name: "b" });

    fireEvent.pointerDown(tab, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(tab, { ...mouse, clientX: 140 });
    fireEvent.pointerUp(list, { ...mouse, buttons: 0, clientX: 140 });
    fireEvent.click(tab, { detail: 1 });

    expect(list.scrollLeft).toBe(60);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
