/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SaveButton } from "./SaveButton";

const postMessage = vi.fn();

beforeEach(() => {
  postMessage.mockClear();
  document.documentElement.style.setProperty("--transition-duration-celebration", "520ms");
  Object.defineProperty(window, "ReactNativeWebView", {
    configurable: true,
    value: { postMessage },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => mediaQuery(false)),
  });
});

afterEach(() => {
  document.documentElement.style.removeProperty("--transition-duration-celebration");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SaveButton 저장 인터랙션", () => {
  it("wide 형태는 굵은 북마크 아이콘을 글자 앞에 둔다", () => {
    render(<SaveButton productName="테스트 제품" saved={false} onToggle={vi.fn()} variant="wide" />);

    const button = screen.getByRole("button", { name: "테스트 제품 저장" });
    const [icon, label] = button.children;

    expect(icon?.querySelector("svg")).toHaveAttribute("stroke-width", "2.5");
    expect(icon).toHaveClass("items-center");
    expect(label).toHaveClass("items-center", "leading-none");
    expect(label).toHaveTextContent("제품 저장");
  });

  it("저장한 뒤에도 글자는 누르면 일어날 일을 적는다", () => {
    render(<SaveButton productName="테스트 제품" saved onToggle={vi.fn()} variant="wide" />);

    const button = screen.getByRole("button", { name: "테스트 제품 저장 해제" });

    expect(button).toHaveTextContent("저장 해제");
    expect(button).not.toHaveTextContent("저장됨");
  });

  it.each(["icon", "wide"] as const)("%s 형태는 이름이 동작을 말하므로 눌림 상태를 따로 두지 않는다", (variant) => {
    render(<SaveButton productName="테스트 제품" saved onToggle={vi.fn()} variant={variant} />);

    expect(screen.getByRole("button", { name: "테스트 제품 저장 해제" })).not.toHaveAttribute("aria-pressed");
  });

  it.each([
    { from: false, notice: "저장했어요" },
    { from: true, notice: "저장을 해제했어요" },
  ])("누른 결과를 보조 기술에 알린다: $notice", async ({ from, notice }) => {
    const name = from ? "테스트 제품 저장 해제" : "테스트 제품 저장";
    render(<SaveButton productName="테스트 제품" saved={from} onToggle={vi.fn()} variant="wide" />);

    await userEvent.click(screen.getByRole("button", { name }));

    expect(screen.getByText(notice)).toHaveAttribute("aria-live", "polite");
  });

  it.each(["icon", "wide"] as const)("%s 형태를 누르면 앱에 선택 햅틱을 요청한다", async (variant) => {
    render(<SaveButton productName="테스트 제품" saved={false} onToggle={vi.fn()} variant={variant} />);

    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));

    expect(postMessage).toHaveBeenCalledWith("poudy:haptic:selection");
  });

  it.each(["icon", "wide"] as const)("%s 형태는 저장 해제할 때 크기가 변하지 않는다", (variant) => {
    render(<SaveButton productName="테스트 제품" saved onToggle={vi.fn()} variant={variant} />);

    expect(screen.getByRole("button", { name: "테스트 제품 저장 해제" }).className).not.toContain("active:scale");
  });

  it.each(["icon", "wide"] as const)("%s 형태를 빠르게 저장 해제하면 불꽃과 pop이 즉시 멈춘다", async (variant) => {
    render(<ControlledSaveButton variant={variant} />);

    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));
    await waitFor(() => expect(sparkAngles()).toHaveLength(5));
    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장 해제" }));

    const button = screen.getByRole("button", { name: "테스트 제품 저장" });
    expect(sparkAngles()).toHaveLength(0);
    expect(button.querySelector("svg")).not.toHaveClass("animate-save-pop");
  });

  it("불꽃이 끝나면 스스로 걷힌다", () => {
    render(<ControlledSaveButton />);

    fireEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));
    expect(sparkAngles()).toHaveLength(5);

    // 시간을 세지 않는다. 조각이 끝났다는 신호를 듣고 걷는다.
    act(() => {
      document.querySelector(".animate-spark-burst")?.dispatchEvent(new Event("animationend"));
    });

    expect(sparkAngles()).toHaveLength(0);
  });

  it("북마크는 불꽃이 끝나기 전에 확대 상태에서 돌아온다", () => {
    render(<ControlledSaveButton />);

    fireEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));
    const pop = screen.getByRole("button", { name: "테스트 제품 저장 해제" }).querySelector(".save-pop");
    if (!(pop instanceof HTMLElement)) throw new TypeError("save-pop element was not rendered");
    expect(pop).toHaveAttribute("data-popped", "true");
    expect(sparkAngles()).toHaveLength(5);

    fireEvent.transitionEnd(pop, { propertyName: "transform" });

    expect(pop).toHaveAttribute("data-popped", "false");
    expect(sparkAngles()).toHaveLength(5);
  });

  it("움직임 줄이기 환경에서는 상태만 저장하고 효과를 실행하지 않는다", async () => {
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery(true));
    render(<ControlledSaveButton />);

    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));

    expect(screen.getByRole("button", { name: "테스트 제품 저장 해제" })).toBeInTheDocument();
    expect(sparkAngles()).toHaveLength(0);
  });

  it("저장할 때마다 불꽃이 서로 다른 각도로 퍼진다", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.2);
    render(<ControlledSaveButton />);

    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));
    await waitFor(() => expect(sparkAngles()).toHaveLength(5));
    const firstAngles = sparkAngles();

    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장 해제" }));
    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));
    await waitFor(() => expect(sparkAngles()).toHaveLength(5));
    const secondAngles = sparkAngles();

    expect(firstAngles).toHaveLength(5);
    expect(new Set(firstAngles).size).toBe(5);
    expect(secondAngles).toHaveLength(5);
    expect(secondAngles).not.toEqual(firstAngles);
  });
});

function ControlledSaveButton({ variant = "icon" }: { readonly variant?: "icon" | "wide" }) {
  const [saved, setSaved] = useState(false);

  return (
    <SaveButton
      productName="테스트 제품"
      saved={saved}
      onToggle={() => setSaved((current) => !current)}
      variant={variant}
    />
  );
}

function sparkAngles() {
  return [...document.querySelectorAll<HTMLElement>(".animate-spark-burst")].map((spark) =>
    spark.style.getPropertyValue("--spark-angle"),
  );
}

function mediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}
