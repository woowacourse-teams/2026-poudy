/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_TOASTS, ToastProvider, useToast } from "./toast";
import type { ToastOptions } from "./toast";

const holder: { api?: ReturnType<typeof useToast> } = {};

function Harness() {
  const api = useToast();
  useEffect(() => {
    holder.api = api;
  }, [api]);
  return (
    <button type="button" data-testid="save">
      저장
    </button>
  );
}

const show = (options: ToastOptions) => act(() => holder.api!.show(options));
const toastOf = (message: string) => screen.getByText(message).closest<HTMLElement>("[data-toast]")!;
const stack = () => document.querySelector<HTMLElement>("[data-toaster]")!;

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById("overlay-root")?.remove();
  });

  it("#overlay-root 의 라이브 영역에 그리고 4초 뒤 사라진다", () => {
    show({ message: "저장했어요" });
    const toast = toastOf("저장했어요");
    expect(document.getElementById("overlay-root")).toContainElement(toast);
    expect(screen.getByRole("status")).toContainElement(toast);

    act(() => vi.advanceTimersByTime(3999));
    expect(toast).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(toast).toHaveAttribute("data-state", "closed");
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText("저장했어요")).toBeNull();
  });

  it("새 토스트는 이전 것을 바꾸지 않고 맨 앞에 쌓으며, 시간은 토스트마다 따로 잰다", () => {
    show({ message: "첫째" });
    act(() => vi.advanceTimersByTime(3000));
    show({ message: "둘째" });
    expect(toastOf("첫째")).toHaveAttribute("data-behind");
    expect(toastOf("둘째")).not.toHaveAttribute("data-behind");

    act(() => vi.advanceTimersByTime(1000));
    expect(toastOf("첫째")).toHaveAttribute("data-state", "closed");
    expect(toastOf("둘째")).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(3000));
    expect(toastOf("둘째")).toHaveAttribute("data-state", "closed");
  });

  it(`${MAX_TOASTS}개를 넘으면 가장 오래된 것을 닫는다`, () => {
    ["하나", "둘", "셋", "넷"].forEach((message) => show({ message }));
    expect(toastOf("하나")).toHaveAttribute("data-state", "closed");
    ["둘", "셋", "넷"].forEach((message) => expect(toastOf(message)).toHaveAttribute("data-state", "open"));
  });

  it("행동 버튼에 포커스가 있는 동안 묶음을 펼치고 모든 토스트의 시간을 멈춘다", () => {
    const save = screen.getByTestId("save");
    show({ message: "뺐어요", action: { label: "되돌리기", onClick: vi.fn(), returnFocusTo: () => save } });
    show({ message: "저장했어요" });
    const button = screen.getByRole("button", { name: "되돌리기" });
    act(() => button.focus());
    expect(stack()).toHaveAttribute("data-expanded");

    act(() => vi.advanceTimersByTime(10_000));
    expect(toastOf("뺐어요")).toHaveAttribute("data-state", "open");
    expect(toastOf("저장했어요")).toHaveAttribute("data-state", "open");

    act(() => save.focus());
    expect(stack()).not.toHaveAttribute("data-expanded");
    act(() => vi.advanceTimersByTime(4000));
    expect(toastOf("저장했어요")).toHaveAttribute("data-state", "closed");
  });

  it("마우스를 올리면 펼쳐 멈추고, 떠나면 남은 시간만큼 더 보인다", () => {
    show({ message: "저장했어요" });
    const toast = toastOf("저장했어요");
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.pointerEnter(stack(), { pointerType: "mouse" });
    expect(stack()).toHaveAttribute("data-expanded");
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.pointerLeave(stack(), { pointerType: "mouse" });
    expect(stack()).not.toHaveAttribute("data-expanded");
    act(() => vi.advanceTimersByTime(2999));
    expect(toast).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(toast).toHaveAttribute("data-state", "closed");
  });

  it("터치로 누르면 펼치고, 묶음 밖을 누르면 접는다", () => {
    show({ message: "첫째" });
    show({ message: "둘째" });
    fireEvent.pointerDown(toastOf("첫째"), { pointerType: "touch" });
    expect(stack()).toHaveAttribute("data-expanded");
    fireEvent.pointerDown(screen.getByTestId("save"), { pointerType: "touch" });
    expect(stack()).not.toHaveAttribute("data-expanded");
  });

  it("브라우저 탭이 백그라운드에 있는 동안 시간을 멈춘다", () => {
    show({ message: "저장했어요" });
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(10_000));
    expect(toastOf("저장했어요")).toHaveAttribute("data-state", "open");
    visibility.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(4000));
    expect(toastOf("저장했어요")).toHaveAttribute("data-state", "closed");
  });

  it("행동을 누르면 실행하고 그 토스트만 닫은 뒤 포커스를 원래 컨트롤로 돌려준다", () => {
    const undo = vi.fn();
    const save = screen.getByTestId("save");
    show({ message: "뺐어요", action: { label: "되돌리기", onClick: undo, returnFocusTo: () => save } });
    show({ message: "저장했어요" });
    const button = screen.getByRole("button", { name: "되돌리기" });
    act(() => button.focus());

    fireEvent.click(button);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(save).toHaveFocus();
    expect(toastOf("뺐어요")).toHaveAttribute("data-state", "closed");
    expect(toastOf("저장했어요")).toHaveAttribute("data-state", "open");
  });
});
