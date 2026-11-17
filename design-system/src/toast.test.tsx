/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "./bottom-sheet";
import { ACTION_TOAST_DURATION_MS, MAX_TOASTS, TOAST_DURATION_MS, ToastProvider, useToast } from "./toast";
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

  it("#overlay-root 의 라이브 영역에 그리고, 글만 있는 토스트는 3초 뒤 사라진다", () => {
    expect(TOAST_DURATION_MS).toBe(3000);
    show({ message: "저장했어요" });
    const toast = toastOf("저장했어요");
    expect(document.getElementById("overlay-root")).toContainElement(toast);
    expect(screen.getByRole("status")).toContainElement(toast);

    act(() => vi.advanceTimersByTime(2999));
    expect(toast).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(toast).toHaveAttribute("data-state", "closed");
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText("저장했어요")).toBeNull();
  });

  it("행동이 있는 토스트는 4초 보인다", () => {
    expect(ACTION_TOAST_DURATION_MS).toBe(4000);
    show({ message: "뺐어요", action: { label: "되돌리기", onClick: vi.fn(), returnFocusTo: () => null } });
    act(() => vi.advanceTimersByTime(3999));
    expect(toastOf("뺐어요")).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(toastOf("뺐어요")).toHaveAttribute("data-state", "closed");
  });

  it("새 토스트는 이전 것을 바꾸지 않고 맨 앞에 쌓으며, 시간은 토스트마다 따로 잰다", () => {
    show({ message: "첫째" });
    act(() => vi.advanceTimersByTime(2000));
    show({ message: "둘째" });
    expect(toastOf("첫째")).toHaveAttribute("data-behind");
    expect(toastOf("둘째")).not.toHaveAttribute("data-behind");

    act(() => vi.advanceTimersByTime(1000));
    expect(toastOf("첫째")).toHaveAttribute("data-state", "closed");
    expect(toastOf("둘째")).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(2000));
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
    act(() => vi.advanceTimersByTime(1999));
    expect(toast).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(toast).toHaveAttribute("data-state", "closed");
  });

  it("누르고 있는 동안 멈추고, 떼면 남은 시간부터 다시 센다", () => {
    show({ message: "저장했어요" });
    const toast = toastOf("저장했어요");
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.pointerDown(toast, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(10_000));
    expect(toast).toHaveAttribute("data-state", "open");

    // 손가락이 묶음 밖으로 나가서 떼도 풀린다.
    fireEvent.pointerUp(document, { pointerType: "touch" });
    expect(stack()).toHaveAttribute("data-expanded");
    act(() => vi.advanceTimersByTime(1999));
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
    act(() => vi.advanceTimersByTime(3000));
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

  describe("시트가 열려 있을 때(#1237)", () => {
    const SHEET_TOP = 468;
    const FRONT = 44;
    let sheetHeight = 768 - SHEET_TOP;
    let aboveHeight = 0;

    function SheetHarness({ withAbove = false }: { readonly withAbove?: boolean }) {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            평가하기
          </button>
          <BottomSheet open={open} onClose={() => setOpen(false)} above={withAbove ? <div>미리보기</div> : undefined}>
            <BottomSheetHeader title="평가" />
            <BottomSheetBody>
              <button type="button" onClick={() => setOpen(false)}>
                닫기
              </button>
            </BottomSheetBody>
          </BottomSheet>
        </>
      );
    }

    const region = () => document.querySelector<HTMLElement>("[data-toast-region]")!;
    const raise = () => region().style.getPropertyValue("--toast-raise");
    const settle = () =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

    beforeEach(() => {
      sheetHeight = 768 - SHEET_TOP;
      aboveHeight = 0;
      // jsdom 은 배치를 하지 않으므로 시트·시트 위 내용·토스트의 높이를 정해 둔다. 화면 높이는 jsdom 기본값 768 이다.
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains("sheet-surface")) return sheetHeight;
        if (this.hasAttribute("data-toast-content")) return FRONT;
        if (this.parentElement?.classList.contains("sheet-above")) return aboveHeight;
        return 0;
      });
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const openSheet = async (withAbove = false) => {
      render(<SheetHarness withAbove={withAbove} />);
      fireEvent.click(screen.getByRole("button", { name: "평가하기" }));
      await settle();
    };

    it("시트를 열어도 떠 있던 토스트를 닫지 않고, 시트 위쪽 끝에서 12 위로 올린다", async () => {
      show({ message: "옮겼어요", action: { label: "되돌리기", onClick: vi.fn(), returnFocusTo: () => null } });
      await openSheet();

      expect(toastOf("옮겼어요")).toHaveAttribute("data-state", "open");
      // 토스트 아래 끝 = 화면 높이 768 − 시트 위쪽 끝 468 + 12
      expect(raise()).toBe(`${768 - SHEET_TOP + 12}px`);
      expect(region()).toHaveAttribute("data-toast-move", "open");
    });

    it("시트가 배경을 막아도 토스트 영역은 막지 않아 행동을 누를 수 있고, 포커스는 시트로 돌아간다", async () => {
      const undo = vi.fn();
      show({
        message: "옮겼어요",
        action: { label: "되돌리기", onClick: undo, returnFocusTo: () => screen.getByTestId("save") },
      });
      await openSheet();

      expect(screen.getByTestId("save").closest("[inert]")).not.toBeNull();
      expect(region().closest("[inert]")).toBeNull();
      const button = screen.getByRole("button", { name: "되돌리기" });
      const inSheet = screen.getByRole("button", { name: "닫기" });
      act(() => inSheet.focus());
      act(() => button.focus());
      fireEvent.click(button);
      expect(undo).toHaveBeenCalledTimes(1);
      // 원래 컨트롤(저장)은 시트 뒤에 막혀 있어, 묶음에 들어오기 전에 포커스가 있던 시트 안 버튼으로 돌려준다.
      expect(inSheet).toHaveFocus();
    });

    it("시트 위 내용이 있으면 그 위 12로 올린다", async () => {
      aboveHeight = 100;
      show({ message: "저장했어요" });
      await openSheet(true);
      expect(raise()).toBe(`${768 - (SHEET_TOP - 24 - 100) + 12}px`);
    });

    it("시트 위에 자리가 없으면 화면 위쪽 12에 붙인다", async () => {
      sheetHeight = 740;
      show({ message: "저장했어요" });
      await openSheet();
      expect(raise()).toBe(`${768 - 12 - FRONT}px`);
    });

    it("시트가 닫히기 시작하면 원래 자리로 내려온다", async () => {
      show({ message: "저장했어요" });
      await openSheet();
      fireEvent.click(screen.getByRole("button", { name: "닫기" }));
      await settle();
      expect(raise()).toBe("0px");
      expect(region()).toHaveAttribute("data-toast-move", "close");
    });

    it("시트가 열린 뒤 처음 뜬 토스트는 올라간 자리에서 옮기지 않고 들어온다", async () => {
      await openSheet();
      show({ message: "평가를 저장하지 못했어요" });
      await settle();
      expect(raise()).toBe(`${768 - SHEET_TOP + 12}px`);
      expect(region()).toHaveAttribute("data-toast-move", "none");
    });
  });

  describe("화면 아래에 붙은 영역이 있을 때(#1274)", () => {
    const SCREEN = 768;
    const SHEET_TOP = 468;
    const FLOAT = "cubic-bezier(0.2, 0, 0, 1)";

    type AreaSpec = {
      readonly id: string;
      /** 화면 아래에서 영역 위쪽 끝까지(다 올라온 자리) */
      readonly height: number;
      readonly hidden?: boolean;
      /** 영역 자신의 translate. 바가 올라오는 도중이면 '0px 100%'처럼 남은 거리다. */
      readonly translate?: string;
      readonly modal?: boolean;
    };

    // 영역은 부품이 스스로 다는 속성(data-bottom-area)만 단다. 화면은 토스트에 따로 알리지 않는다.
    function Areas({ areas }: { readonly areas: readonly AreaSpec[] }) {
      return areas.map((area) => {
        const element = (
          <div
            key={area.id}
            data-bottom-area=""
            data-testid={area.id}
            data-height={area.height}
            data-translate={area.translate}
            inert={area.hidden}
          />
        );
        return area.modal ? (
          <div key={area.id} role="dialog" aria-modal="true">
            {element}
          </div>
        ) : (
          element
        );
      });
    }

    const region = () => document.querySelector<HTMLElement>("[data-toast-region]")!;
    const raise = () => region().style.getPropertyValue("--toast-raise");
    const settle = () =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
    let running: Animation[] = [];

    /** 영역의 translate 가 남긴 세로 거리(px). 퍼센트는 영역 높이 기준이다. */
    const translatePx = (element: HTMLElement) => {
      const y = element.dataset.translate?.split(" ")[1];
      if (!y) return 0;
      return y.endsWith("%") ? (Number.parseFloat(y) / 100) * Number(element.dataset.height) : Number.parseFloat(y);
    };

    // jsdom 은 배치와 움직임이 없으므로 영역의 자리·translate·돌고 있는 움직임, 시트의 높이를 정해 둔다. 화면 높이는 768 이다.
    beforeEach(() => {
      running = [];
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
        if (!this.dataset.height) return new DOMRect(0, 0, 0, 0);
        const height = Number(this.dataset.height);
        return new DOMRect(0, SCREEN - height + translatePx(this), 390, height);
      });
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
        if (this.dataset.height) return Number(this.dataset.height);
        if (this.classList.contains("sheet-surface")) return SCREEN - SHEET_TOP;
        return 0;
      });
      const original = window.getComputedStyle.bind(window);
      vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
        const translate = element instanceof HTMLElement ? element.dataset.translate : undefined;
        return translate ? ({ translate } as CSSStyleDeclaration) : original(element, pseudo);
      });
      Object.defineProperty(HTMLElement.prototype, "getAnimations", {
        configurable: true,
        value(this: HTMLElement) {
          return this.dataset.translate ? running : [];
        },
      });
    });
    afterEach(() => {
      vi.restoreAllMocks();
      Reflect.deleteProperty(HTMLElement.prototype, "getAnimations");
    });

    /** 바가 오르내리는 움직임. base(240) · ease-float 이고 elapsed 만큼 지났다. */
    const barMotion = (elapsed = 0) =>
      ({
        playState: "running",
        currentTime: elapsed,
        effect: { getComputedTiming: () => ({ endTime: 240 }), getTiming: () => ({ easing: FLOAT }) },
      }) as unknown as Animation;

    it("영역이 보이면 그 위 12에 뜨고, 처음 뜬 토스트는 이미 올라간 자리에서 들어온다", async () => {
      render(<Areas areas={[{ id: "bar", height: 81 }]} />);
      show({ message: "저장했어요" });
      await settle();
      // 토스트 영역은 화면 아래 12 에 있어, 영역 높이만큼 올리면 영역 위 12 다.
      expect(raise()).toBe("81px");
      expect(region()).toHaveAttribute("data-toast-move", "none");
    });

    it("제품 상세 하단 고정 바가 올라오면 다 올라온 자리를 기준으로 바와 같은 시간·곡선으로 따라 오른다", async () => {
      const { rerender } = render(<Areas areas={[{ id: "bar", height: 81, hidden: true, translate: "0px 100%" }]} />);
      show({ message: "파우치에 저장했어요" });
      await settle();
      expect(raise()).toBe("");

      // 바가 막 올라오기 시작했다. inert 가 풀렸지만 아직 제 높이만큼 아래에 있다.
      running = [barMotion()];
      rerender(<Areas areas={[{ id: "bar", height: 81, translate: "0px 100%" }]} />);
      await settle();
      expect(raise()).toBe("81px");
      expect(region()).toHaveAttribute("data-toast-move", "area");
      expect(region().style.getPropertyValue("--toast-move-duration")).toBe("240ms");
      expect(region().style.getPropertyValue("--toast-move-ease")).toBe(FLOAT);
    });

    it("영역이 inert 가 되면 바의 남은 움직임만큼 함께 내려온다", async () => {
      const { rerender } = render(<Areas areas={[{ id: "bar", height: 81, translate: "0px 0%" }]} />);
      show({ message: "파우치에 저장했어요" });
      await settle();
      expect(raise()).toBe("81px");

      running = [barMotion(40)];
      rerender(<Areas areas={[{ id: "bar", height: 81, hidden: true, translate: "0px 0%" }]} />);
      await settle();
      expect(raise()).toBe("0px");
      expect(region()).toHaveAttribute("data-toast-move", "area");
      expect(region().style.getPropertyValue("--toast-move-duration")).toBe("200ms");
    });

    it("영역이 움직임 없이 사라지면 바로 새 자리에 놓는다", async () => {
      const { rerender } = render(<Areas areas={[{ id: "nav", height: 69 }]} />);
      show({ message: "저장했어요" });
      await settle();
      expect(raise()).toBe("69px");

      rerender(<Areas areas={[{ id: "nav", height: 69, hidden: true }]} />);
      await settle();
      expect(raise()).toBe("0px");
      expect(region()).toHaveAttribute("data-toast-move", "none");
    });

    it("토스트가 떠 있는 동안 영역이 새로 붙으면 그 위로 오른다", async () => {
      const { rerender } = render(<Areas areas={[]} />);
      show({ message: "저장했어요" });
      await settle();
      rerender(<Areas areas={[{ id: "bar", height: 81 }]} />);
      await settle();
      expect(raise()).toBe("81px");
    });

    it("영역이 여럿이면 가장 높이 올라온 영역 위에 뜬다", async () => {
      // 하단 내비(69) 위에 하단 행동 영역(81)이 붙어 있어, 그 위쪽 끝은 화면 아래에서 150 이다.
      render(
        <Areas
          areas={[
            { id: "nav", height: 69 },
            { id: "bar", height: 150 },
          ]}
        />,
      );
      show({ message: "저장했어요" });
      await settle();
      expect(raise()).toBe("150px");
    });

    it("화면을 덮은 모달 대화 상자가 있으면 그 안의 영역만 잰다", async () => {
      render(
        <Areas
          areas={[
            { id: "page", height: 150 },
            { id: "picker", height: 81, modal: true },
          ]}
        />,
      );
      show({ message: "저장했어요" });
      await settle();
      expect(raise()).toBe("81px");
    });

    it("시트가 열리면 시트 위가 우선하고, 닫히기 시작하면 영역 위로 내려온다", async () => {
      function Page() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Areas areas={[{ id: "bar", height: 81 }]} />
            <button type="button" onClick={() => setOpen(true)}>
              평가하기
            </button>
            <BottomSheet open={open} onClose={() => setOpen(false)}>
              <BottomSheetHeader title="평가" />
              <BottomSheetBody>
                <button type="button" onClick={() => setOpen(false)}>
                  닫기
                </button>
              </BottomSheetBody>
            </BottomSheet>
          </>
        );
      }
      render(<Page />);
      show({ message: "저장했어요" });
      await settle();
      expect(raise()).toBe("81px");

      fireEvent.click(screen.getByRole("button", { name: "평가하기" }));
      await settle();
      expect(raise()).toBe(`${SCREEN - SHEET_TOP + 12}px`);
      expect(region()).toHaveAttribute("data-toast-move", "open");

      fireEvent.click(screen.getByRole("button", { name: "닫기" }));
      await settle();
      expect(raise()).toBe("81px");
      expect(region()).toHaveAttribute("data-toast-move", "close");
    });
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
