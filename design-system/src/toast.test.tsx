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

  it("show 가 돌려준 함수는 그 토스트만 닫는다", () => {
    let close = () => {};
    act(() => {
      close = holder.api!.show({ message: "뺐어요" });
    });
    show({ message: "저장했어요" });

    act(() => close());
    expect(toastOf("뺐어요")).toHaveAttribute("data-state", "closed");
    expect(toastOf("저장했어요")).toHaveAttribute("data-state", "open");
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

  describe("행동의 자리", () => {
    const action = { label: "되돌리기", onClick: () => {}, returnFocusTo: () => null };
    const messageOf = (message: string) => screen.getByText(message);
    const sizerOf = (message: string) => messageOf(message).style.getPropertyValue("--toast-message-sizer");

    it("자리가 모자라면 행동이 문장 아래로 내려가도록 줄바꿈을 허용한다", () => {
      show({ message: "뺐어요", action });
      const row = toastOf("뺐어요").querySelector("[data-toast-content]");
      expect(row).toHaveClass("flex-wrap", "gap-y-3");
      expect(messageOf("뺐어요")).toHaveAttribute("data-toast-message");
      // 내려간 버튼 글자가 문장 왼쪽 끝과 맞도록 왼쪽 8 을 문장이 맡는다. 버튼의 안쪽 여백 8 과 더해 어느 자리든 16 이다.
      expect(row).toHaveClass("px-2");
      expect(messageOf("뺐어요")).toHaveClass("pl-2");
    });

    it("문장의 최소 폭은 em 이 아니라 숨긴 글자가 정한다: 앞 12글자와 두 줄로 나눈 문장", () => {
      const short = "위시리스트에서 뺐어요";
      const long = "파우치에 저장했어요. 평가는 파우치에서 언제든 할 수 있어요";
      show({ message: short, action });
      show({ message: long, action });
      expect(sizerOf(short)).toBe('"위시리스트에서 뺐어요\\A 위시리스트에서\\A 뺐어요"');
      expect(sizerOf(long)).toBe('"파우치에 저장했어요. \\A 파우치에 저장했어요. 평가는\\A 파우치에서 언제든 할 수 있어요"');
    });

    it("공백이 없는 문장은 나누지 않고, 따옴표는 CSS 문자열 안에서 이스케이프한다", () => {
      const noSpace = "가".repeat(20);
      const quoted = '"긴 이름" 뺐어요';
      show({ message: noSpace, action });
      show({ message: quoted, action });
      expect(sizerOf(noSpace)).toBe(`"${"가".repeat(12)}\\A ${noSpace}"`);
      expect(sizerOf(quoted)).toBe('"\\"긴 이름\\" 뺐어요\\A \\"긴 이름\\"\\A 뺐어요"');
    });

    it("숨긴 글자는 DOM 에 없어 문장의 글자와 낭독에 섞이지 않는다", () => {
      show({ message: "뺐어요", action });
      expect(messageOf("뺐어요").textContent).toBe("뺐어요");
      expect(messageOf("뺐어요").children).toHaveLength(0);
    });

    it("행동이 없는 토스트는 예전 그대로다", () => {
      show({ message: "저장했어요" });
      expect(toastOf("저장했어요").querySelector("[data-toast-content]")).toHaveClass("px-4");
      expect(messageOf("저장했어요")).toHaveClass("min-w-0");
      expect(messageOf("저장했어요")).not.toHaveAttribute("data-toast-message");
      expect(messageOf("저장했어요")).not.toHaveClass("pl-2");
      expect(sizerOf("저장했어요")).toBe("");
    });
  });
});
