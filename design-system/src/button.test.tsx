/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { IconButton } from "./icon-button";
import { usePressable } from "./use-pressable";

const RECT = {
  left: 0,
  top: 0,
  right: 100,
  bottom: 48,
  width: 100,
  height: 48,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

const pointer = (x = 10, y = 10) => ({
  pointerId: 1,
  button: 0,
  clientX: x,
  clientY: y,
  pointerType: "touch",
});

const renderButton = (props: Partial<Parameters<typeof Button>[0]> = {}) => {
  const onClick = vi.fn();
  render(
    <Button onClick={onClick} {...props}>
      저장
    </Button>,
  );
  const button = screen.getByRole("button", { name: "저장" });
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue(RECT as DOMRect);
  return { button, onClick };
};

describe("Button 의 누름(usePressable 계약)", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(callback, 0));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("누르는 동안 data-pressed 를 붙이고, 떼면 뗀다", () => {
    const { button } = renderButton();
    fireEvent.pointerDown(button, pointer());
    expect(button).toHaveAttribute("data-pressed");
    fireEvent.pointerUp(button, pointer());
    expect(button).not.toHaveAttribute("data-pressed");
  });

  it("10px 넘게 움직이면 누름을 취소하고 뒤따르는 click 도 막는다", () => {
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, pointer(10, 10));
    fireEvent.pointerMove(button, pointer(10, 22));
    expect(button).not.toHaveAttribute("data-pressed");
    fireEvent.pointerUp(button, pointer(10, 22));
    fireEvent.click(button, { detail: 1 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("누른 채 밖으로 나갔다가 다시 들어와 떼도 확정하지 않는다", () => {
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, pointer(10, 10));
    fireEvent.pointerMove(button, pointer(10, 60));
    fireEvent.pointerMove(button, pointer(12, 10));
    fireEvent.pointerUp(button, pointer(12, 10));
    fireEvent.click(button, { detail: 1 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("취소는 한 번만 쓴다. 다음 누름은 그대로 확정된다", () => {
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, pointer(10, 10));
    fireEvent.pointerCancel(button, pointer(10, 10));
    fireEvent.click(button, { detail: 1 });
    fireEvent.pointerDown(button, pointer(10, 10));
    fireEvent.pointerUp(button, pointer(10, 10));
    fireEvent.click(button, { detail: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aria-disabled 버튼은 키보드 click 도 막고 눌림을 켜지 않는다", () => {
    const parent = vi.fn();
    const onClick = vi.fn();
    render(
      <div onClick={parent}>
        <Button aria-disabled="true" onClick={onClick}>
          가입하기
        </Button>
      </div>,
    );
    const button = screen.getByRole("button", { name: "가입하기" });
    fireEvent.pointerDown(button, pointer());
    expect(button).not.toHaveAttribute("data-pressed");
    fireEvent.click(button, { detail: 0 });
    expect(onClick).not.toHaveBeenCalled();
    expect(parent).not.toHaveBeenCalled();
  });

  it("처리 중이면 aria-busy 를 알리고 다시 누를 수 없다", () => {
    const { button, onClick } = renderButton({ busy: true });
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button, { detail: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("마우스를 올리면 hover 를 켜고, 손가락으로는 켜지 않는다", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { button } = renderButton();
    fireEvent.pointerEnter(button, { pointerType: "touch" });
    expect(button).not.toHaveAttribute("data-hovered");
    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    expect(button).toHaveAttribute("data-hovered");
    fireEvent.pointerLeave(button, { pointerType: "mouse" });
    expect(button).not.toHaveAttribute("data-hovered");
  });

  it("쓰는 쪽의 핸들러도 함께 부른다", () => {
    const onPointerDown = vi.fn();
    const { button } = renderButton({ onPointerDown });
    fireEvent.pointerDown(button, pointer());
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute("data-pressed");
  });
});

describe("usePressable 의 지연", () => {
  it("스크롤 목록처럼 지연을 주면 그 시간이 지난 뒤에 눌림을 켠다", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePressable({ delayMs: 90 }));
    const target = {
      getBoundingClientRect: () => RECT,
    } as unknown as HTMLElement;
    act(() => {
      result.current.pressableProps.onPointerDown({
        ...pointer(),
        currentTarget: target,
      } as never);
    });
    expect(result.current.pressed).toBe(false);
    act(() => {
      vi.advanceTimersByTime(90);
    });
    expect(result.current.pressed).toBe(true);
    vi.useRealTimers();
  });
});

describe("Button 의 변형", () => {
  it("검정 면 버튼은 fb-dim 과 press-scale 을 쓴다", () => {
    const { button } = renderButton();
    expect(button).toHaveClass("pressable", "fb-dim", "press-scale", "bg-action", "h-12", "rounded-xl");
  });

  it("목록 행 오른쪽의 테두리 버튼은 높이 32 이고 크기를 받지 않는다", () => {
    const { button } = renderButton({ variant: "outline", size: "lg" });
    expect(button).toHaveClass("h-8", "fb-surface", "border-border-strong");
    expect(button).not.toHaveClass("h-14");
  });

  it("글자 버튼은 행이라 크기를 줄이지 않는다", () => {
    const { button } = renderButton({ variant: "text" });
    expect(button).toHaveClass("fb-surface");
    expect(button).not.toHaveClass("press-scale");
  });

  it("쓰는 쪽의 className 이 기본값을 이긴다", () => {
    const { button } = renderButton({ className: "w-full rounded-none" });
    expect(button).toHaveClass("w-full", "rounded-none");
    expect(button).not.toHaveClass("rounded-xl");
  });
});

describe("IconButton", () => {
  it("label 이 접근 가능한 이름이 된다", () => {
    render(<IconButton label="닫기" icon={<svg />} />);
    expect(screen.getByRole("button", { name: "닫기" })).toHaveClass("fb-circle", "size-11");
  });

  it("사진 위 버튼은 이중 포커스 링을 위한 표식을 단다", () => {
    render(<IconButton variant="overlay" label="다음 사진" icon={<svg />} />);
    expect(screen.getByRole("button", { name: "다음 사진" })).toHaveAttribute("data-on-image");
  });
});
