/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./toast";
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
    const toast = screen.getByText("저장했어요");
    expect(document.getElementById("overlay-root")).toContainElement(toast);
    expect(screen.getByRole("status")).toContainElement(toast);

    act(() => vi.advanceTimersByTime(3999));
    expect(toast.parentElement).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(toast.parentElement).toHaveAttribute("data-state", "closed");
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText("저장했어요")).toBeNull();
  });

  it("새 토스트는 이전 것을 바로 바꾸고 시간을 처음부터 잰다", () => {
    show({ message: "첫째" });
    act(() => vi.advanceTimersByTime(3000));
    show({ message: "둘째" });
    expect(screen.queryByText("첫째")).toBeNull();
    act(() => vi.advanceTimersByTime(3999));
    expect(screen.getByText("둘째").parentElement).toHaveAttribute("data-state", "open");
  });

  it("행동 버튼에 포커스가 있는 동안 멈추고, 새 토스트는 하나만 대기시킨다", () => {
    const undo = vi.fn();
    const save = screen.getByTestId("save");
    show({ message: "뺐어요", action: { label: "되돌리기", onClick: undo, returnFocusTo: () => save } });
    const button = screen.getByRole("button", { name: "되돌리기" });
    act(() => button.focus());

    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("뺐어요")).toBeInTheDocument();

    show({ message: "대기 1" });
    show({ message: "대기 2" });
    expect(screen.getByText("뺐어요")).toBeInTheDocument();
    expect(screen.queryByText("대기 2")).toBeNull();

    act(() => button.blur());
    expect(screen.queryByText("뺐어요")).toBeNull();
    expect(screen.queryByText("대기 1")).toBeNull();
    expect(screen.getByText("대기 2")).toBeInTheDocument();
  });

  it("포인터가 올라가 있는 동안 멈추고, 떠나면 남은 시간만큼 더 보인다", () => {
    const save = screen.getByTestId("save");
    show({ message: "뺐어요", action: { label: "되돌리기", onClick: vi.fn(), returnFocusTo: () => save } });
    const toast = screen.getByText("뺐어요").parentElement!;
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.pointerEnter(toast);
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.pointerLeave(toast);
    act(() => vi.advanceTimersByTime(2999));
    expect(toast).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(toast).toHaveAttribute("data-state", "closed");
  });

  it("행동 없는 토스트는 포인터가 올라가도 멈추지 않는다", () => {
    show({ message: "저장했어요" });
    const toast = screen.getByText("저장했어요").parentElement!;
    fireEvent.pointerEnter(toast);
    act(() => vi.advanceTimersByTime(4000));
    expect(toast).toHaveAttribute("data-state", "closed");
  });

  it("행동을 누르면 실행하고 닫은 뒤 포커스를 원래 컨트롤로 돌려준다", () => {
    const undo = vi.fn();
    const save = screen.getByTestId("save");
    show({ message: "뺐어요", action: { label: "되돌리기", onClick: undo, returnFocusTo: () => save } });
    const button = screen.getByRole("button", { name: "되돌리기" });
    act(() => button.focus());
    show({ message: "대기" });

    fireEvent.click(button);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(save).toHaveFocus();
    expect(screen.queryByText("뺐어요")).toBeNull();
    expect(screen.getByText("대기")).toBeInTheDocument();
  });
});
