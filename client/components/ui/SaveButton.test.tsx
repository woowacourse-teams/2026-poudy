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

  it("공통 모션 토큰의 지속 시간이 지나면 효과를 정리한다", () => {
    vi.useFakeTimers();
    document.documentElement.style.setProperty("--transition-duration-celebration", "0.24s");
    render(<ControlledSaveButton />);

    fireEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));
    expect(sparkAngles()).toHaveLength(5);

    act(() => vi.advanceTimersByTime(239));
    expect(sparkAngles()).toHaveLength(5);

    act(() => vi.advanceTimersByTime(1));
    expect(sparkAngles()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "테스트 제품 저장 해제" }).querySelector("svg")).not.toHaveClass(
      "animate-save-pop",
    );
  });

  it("움직임 줄이기 환경에서는 상태만 저장하고 효과를 실행하지 않는다", async () => {
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery(true));
    render(<ControlledSaveButton />);

    await userEvent.click(screen.getByRole("button", { name: "테스트 제품 저장" }));

    expect(screen.getByRole("button", { name: "테스트 제품 저장 해제" })).toHaveAttribute("aria-pressed", "true");
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
