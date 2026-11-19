/** @vitest-environment jsdom */
import type { RoutineProductResponse } from "@poudy/api/api.zod";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EDGE_ZONE, edgeScrollSpeed, MAX_EDGE_SCROLL_SPEED, RoutineSortableList } from "./RoutineSortableList";

vi.mock("@/lib/interaction/haptic", () => ({ requestSelectionHaptic: vi.fn() }));

const ROW_HEIGHT = 80;
const PRODUCTS: readonly RoutineProductResponse[] = ["토너", "세럼", "크림", "선크림"].map((name, index) => ({
  id: index + 1,
  name,
  brandName: "브랜드",
  imageUrl: "",
}));
const touch = { pointerId: 1, pointerType: "touch", button: 0 } as const;

/** 첫 행의 화면 위치(clientY). 행은 여기서부터 ROW_HEIGHT 씩 아래에 놓인다. */
const LIST_TOP = 200;
/** 문서 높이. 창(jsdom 768) 보다 길어 위아래로 스크롤할 수 있다. */
const DOCUMENT_HEIGHT = 3000;

let scrollY = 0;
/** 요청된 애니메이션 프레임. 시험이 runFrames 로 직접 돌린다. */
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
let now = 0;

/** 60Hz 로 count 프레임을 돌린다. 프레임 안에서 다음 프레임을 요청하면 다음 차례에 돈다. */
const runFrames = (count: number) => {
  for (let index = 0; index < count; index += 1) {
    now += 1000 / 60;
    const due = [...frames.values()];
    frames.clear();
    act(() => due.forEach((callback) => callback(now)));
  }
};

/**
 * jsdom 은 레이아웃이 없어 행 높이와 행 위치를 꾸미고, 포인터 캡처도 빈 함수로 채운다. 문서 스크롤과 애니메이션 프레임도
 * 꾸며, 자동 스크롤이 움직인 거리와 남은 프레임을 시험이 읽는다.
 */
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.tagName === "LI" ? ROW_HEIGHT : 0;
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const index = this.tagName === "LI" ? [...(this.parentElement?.children ?? [])].indexOf(this) : 0;
    return DOMRect.fromRect({ y: LIST_TOP + index * ROW_HEIGHT, height: ROW_HEIGHT });
  });
  HTMLElement.prototype.setPointerCapture = vi.fn();

  scrollY = 0;
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: DOCUMENT_HEIGHT });
  window.scrollBy = vi.fn((options?: ScrollToOptions | number) => {
    const top = typeof options === "object" ? (options.top ?? 0) : 0;
    scrollY = Math.min(Math.max(scrollY + top, 0), DOCUMENT_HEIGHT - window.innerHeight);
  }) as typeof window.scrollBy;

  frames.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frameId += 1;
    frames.set(frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** 붙은 탭 줄 아래(100)부터 아래 끝(700)까지가 보이는 영역이다. */
const AREA = { top: 100, bottom: 700 } as const;

const renderList = (visibleArea?: () => { readonly top: number; readonly bottom: number }) => {
  const onReorder = vi.fn(() => Promise.resolve());
  const view = render(
    <RoutineSortableList products={PRODUCTS} onReorder={onReorder} onOpenMenu={vi.fn()} visibleArea={visibleArea} />,
  );
  return { onReorder, unmount: view.unmount };
};

const handleOf = (name: string) => screen.getByRole("button", { name: `${name} 순서 바꾸기` });
const rows = () => screen.getAllByRole("listitem");
const names = () => rows().map((row) => row.querySelector(".text-body.truncate")?.textContent);
const shifts = () => rows().map((row) => row.style.getPropertyValue("--routine-row-shift"));

/** 손잡이를 길게 눌러 끌기를 시작하고, 손가락을 rowsMoved 행만큼 옮긴다. 음수면 위로 옮긴다. */
const dragBy = (name: string, rowsMoved: number) => {
  const handle = handleOf(name);
  fireEvent.pointerDown(handle, { ...touch, clientY: 400 });
  act(() => vi.advanceTimersByTime(200));
  fireEvent.pointerMove(handle, { ...touch, clientY: 400 + rowsMoved * ROW_HEIGHT });
  return handle;
};

describe("RoutineSortableList 끌어서 순서 바꾸기", () => {
  it("위로 끌면 끄는 행은 손가락을 따라가고, 지나친 행은 한 칸씩 아래로 비켜선다", async () => {
    const { onReorder } = renderList();

    const handle = dragBy("선크림", -2);

    expect(shifts()).toEqual(["0px", "80px", "80px", "-160px"]);

    fireEvent.pointerUp(handle, { ...touch, clientY: 240 });
    await act(async () => undefined);

    expect(onReorder).toHaveBeenCalledExactlyOnceWith({ from: 3, to: 1 });
    expect(names()).toEqual(["토너", "선크림", "세럼", "크림"]);
    expect(shifts()).toEqual(["0px", "0px", "0px", "0px"]);
  });

  it("아래로 끌면 지나친 행은 한 칸씩 위로 비켜선다", async () => {
    const { onReorder } = renderList();

    const handle = dragBy("토너", 2);

    expect(shifts()).toEqual(["160px", "-80px", "-80px", "0px"]);

    fireEvent.pointerUp(handle, { ...touch, clientY: 560 });
    await act(async () => undefined);

    expect(onReorder).toHaveBeenCalledExactlyOnceWith({ from: 0, to: 2 });
    expect(names()).toEqual(["세럼", "크림", "토너", "선크림"]);
  });

  it("목록 밖으로 끌어도 놓을 자리는 처음과 끝에서 멈춘다", async () => {
    const { onReorder } = renderList();

    fireEvent.pointerUp(dragBy("크림", -5), { ...touch, clientY: 0 });
    await act(async () => undefined);

    expect(onReorder).toHaveBeenLastCalledWith({ from: 2, to: 0 });
  });

  it.each([
    ["위", "선크림", -2],
    ["아래", "토너", 2],
  ])("%s로 끄는 행은 고정 층(상단 내비·탭 줄·하단 내비) 밑의 올림 층에 뜬다", (_, name, rowsMoved) => {
    renderList();

    dragBy(name, rowsMoved);

    const dragged = handleOf(name).closest("li");
    expect(dragged).toHaveClass("z-(--z-raised)");
    expect(dragged).not.toHaveClass("z-(--z-sticky)");
  });

  it("짧게 누르고 떼면 끌기가 시작되지 않아 순서를 바꾸지 않는다", () => {
    const { onReorder } = renderList();
    const handle = handleOf("선크림");

    fireEvent.pointerDown(handle, { ...touch, clientY: 400 });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerMove(handle, { ...touch, clientY: 240 });
    fireEvent.pointerUp(handle, { ...touch, clientY: 240 });

    expect(onReorder).not.toHaveBeenCalled();
    expect(shifts()).toEqual(["0px", "0px", "0px", "0px"]);
  });
});

describe("edgeScrollSpeed 가장자리 자동 스크롤 속도", () => {
  it.each([
    ["보이는 영역 가운데", 400, 0],
    ["위 가장자리 띠 바로 바깥", AREA.top + EDGE_ZONE, 0],
    ["위 가장자리 띠 절반", AREA.top + EDGE_ZONE / 2, -MAX_EDGE_SCROLL_SPEED / 2],
    ["위 끝", AREA.top, -MAX_EDGE_SCROLL_SPEED],
    ["탭 줄 위(영역 밖)", AREA.top - 60, -MAX_EDGE_SCROLL_SPEED],
    ["아래 가장자리 띠 절반", AREA.bottom - EDGE_ZONE / 2, MAX_EDGE_SCROLL_SPEED / 2],
    ["아래 끝 너머(영역 밖)", AREA.bottom + 30, MAX_EDGE_SCROLL_SPEED],
  ])("%s에서는 %d 위치의 속도가 %d px/s 다", (_, pointerY, speed) => {
    expect(edgeScrollSpeed(pointerY, AREA)).toBe(speed);
  });

  it("영역이 띠 두 개보다 낮으면 띠를 절반 높이로 줄여 위아래가 겹치지 않는다", () => {
    expect(edgeScrollSpeed(150, { top: 100, bottom: 200 })).toBe(0);
    expect(edgeScrollSpeed(125, { top: 100, bottom: 200 })).toBe(-MAX_EDGE_SCROLL_SPEED / 2);
  });
});

describe("RoutineSortableList 끄는 동안 가장자리 자동 스크롤", () => {
  const draggedShift = (name: string) => handleOf(name).closest("li")?.style.getPropertyValue("--routine-row-shift");

  /** 선크림(4번째 행, 화면 위치 440)을 길게 누르고, 손가락을 pointerY 로 옮긴다. */
  const dragSunscreenTo = (pointerY: number) => {
    const handle = handleOf("선크림");
    fireEvent.pointerDown(handle, { ...touch, clientY: 480 });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerMove(handle, { ...touch, clientY: pointerY });
    return handle;
  };

  it("위 가장자리에 손가락을 대면 위로 스크롤하고, 스크롤한 만큼 끄는 행과 놓을 자리가 따라간다", async () => {
    scrollY = 1000;
    const { onReorder } = renderList(() => AREA);

    // 띠 안 140(띠 끝에서 40) → 최고 속도의 절반. 손가락은 40 만큼 올라 행은 아직 한 칸도 넘지 않았다.
    const handle = dragSunscreenTo(140 + 300);
    expect(scrollY).toBe(1000);
    fireEvent.pointerMove(handle, { ...touch, clientY: 140 });
    expect(draggedShift("선크림")).toBe("-340px");
    expect(frames.size).toBe(1);

    runFrames(30);

    // 360px/s 로 0.5초 → 180 올라간다. 손가락은 그대로라 행은 그만큼 더 위 자리로 간다.
    const scrolled = scrollY - 1000;
    expect(scrolled).toBe(-180);
    expect(draggedShift("선크림")).toBe(`${-340 + scrolled}px`);
    expect(window.scrollBy).toHaveBeenCalledWith({ top: -6, behavior: "instant" });

    fireEvent.pointerUp(handle, { ...touch, clientY: 140 });
    await act(async () => undefined);

    // -520 / 80 = -6.5 칸 → 맨 위로 간다.
    expect(onReorder).toHaveBeenCalledExactlyOnceWith({ from: 3, to: 0 });
  });

  it("끄는 행은 탭 줄 밑으로 들어가지 않고 보이는 영역 위 끝에 멈춘다", () => {
    scrollY = 1000;
    renderList(() => AREA);

    dragSunscreenTo(AREA.top - 60);

    // 행의 화면 위치 440 → 영역 위 끝 100 까지만 올라간다.
    expect(draggedShift("선크림")).toBe("-340px");
    runFrames(10);
    // 스크롤한 만큼 행이 내용 안에서 더 올라가지만, 화면 위치는 영역 위 끝에 그대로 머문다.
    expect(draggedShift("선크림")).toBe(`${-340 + (scrollY - 1000)}px`);
  });

  it("아래 가장자리에 손가락을 대면 아래로 스크롤한다", () => {
    scrollY = 500;
    renderList(() => AREA);

    const handle = handleOf("토너");
    fireEvent.pointerDown(handle, { ...touch, clientY: 240 });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerMove(handle, { ...touch, clientY: AREA.bottom });
    runFrames(6);

    // 720px/s 로 6 프레임(0.1초) → 72 내려간다. 프레임 시간의 소수 오차로 1px 덜 갈 수 있다.
    expect(scrollY - 500).toBeGreaterThanOrEqual(71);
    expect(scrollY - 500).toBeLessThanOrEqual(72);
  });

  it("손가락이 가장자리 띠를 벗어나면 스크롤을 멈춘다", () => {
    scrollY = 1000;
    renderList(() => AREA);

    const handle = dragSunscreenTo(AREA.top);
    runFrames(5);
    const stoppedAt = scrollY;
    fireEvent.pointerMove(handle, { ...touch, clientY: 400 });
    runFrames(5);

    expect(scrollY).toBe(stoppedAt);
    expect(frames.size).toBe(0);
  });

  it("문서 맨 위에 닿으면 스크롤을 멈춘다", () => {
    scrollY = 30;
    renderList(() => AREA);

    dragSunscreenTo(AREA.top);
    runFrames(10);

    expect(scrollY).toBe(0);
    expect(frames.size).toBe(0);
  });

  it.each([
    ["손을 떼면", "pointerUp"],
    ["끌기가 취소되면", "pointerCancel"],
  ] as const)("%s 스크롤 루프를 거둔다", (_, end) => {
    scrollY = 1000;
    renderList(() => AREA);

    const handle = dragSunscreenTo(AREA.top);
    runFrames(2);
    fireEvent[end](handle, { ...touch, clientY: AREA.top });
    const stoppedAt = scrollY;
    runFrames(5);

    expect(frames.size).toBe(0);
    expect(scrollY).toBe(stoppedAt);
  });

  it("끄는 도중에 화면을 떠나면 스크롤 루프를 거둔다", () => {
    scrollY = 1000;
    const { unmount } = renderList(() => AREA);

    dragSunscreenTo(AREA.top);
    expect(frames.size).toBe(1);
    unmount();

    expect(frames.size).toBe(0);
  });

  it("보이는 영역을 주지 않으면 창 전체를 영역으로 쓴다", () => {
    scrollY = 1000;
    renderList();

    dragSunscreenTo(10);
    runFrames(3);

    expect(scrollY).toBeLessThan(1000);
  });
});
