/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { requestSelectionHaptic } from "./haptic";
import { RangeSlider } from "./range-slider";
import { Slider } from "./slider";

vi.mock("./haptic", () => ({ requestSelectionHaptic: vi.fn() }));

describe("RangeSlider", () => {
  const STEPS = ["없음", "낮음", "보통", "높음"];

  function Sample({ initial = [1, 2] as const }: { readonly initial?: readonly [number, number] }) {
    const [value, setValue] = useState<readonly [number, number]>(initial);
    return <RangeSlider label="수분감" steps={STEPS} value={value} onValueChange={setValue} tone="moisture" />;
  }

  it("손잡이마다 slider 이고, '수분감 최소 낮음'처럼 읽는다", () => {
    render(<Sample />);

    expect(screen.getByRole("slider", { name: "수분감 최소" })).toHaveAttribute("aria-valuetext", "수분감 최소 낮음");
    expect(screen.getByRole("slider", { name: "수분감 최대" })).toHaveAttribute("aria-valuetext", "수분감 최대 보통");
  });

  it("방향키는 한 단계씩 옮기되 상대 손잡이를 넘지 않고, Home/End 는 끝이나 상대 손잡이까지 간다", () => {
    render(<Sample />);
    const low = screen.getByRole("slider", { name: "수분감 최소" });
    const high = screen.getByRole("slider", { name: "수분감 최대" });

    fireEvent.keyDown(low, { key: "ArrowRight" });
    fireEvent.keyDown(low, { key: "ArrowRight" });
    expect(low).toHaveAttribute("aria-valuenow", "2");

    fireEvent.keyDown(high, { key: "End" });
    expect(high).toHaveAttribute("aria-valuenow", "3");

    fireEvent.keyDown(low, { key: "Home" });
    expect(low).toHaveAttribute("aria-valuenow", "0");

    fireEvent.keyDown(high, { key: "Home" });
    expect(high).toHaveAttribute("aria-valuenow", "0");
  });

  it("단계 이름을 누르면 가까운 손잡이가 옮겨 가고, 범위를 알린다", () => {
    render(<Sample />);

    fireEvent.click(screen.getByText("높음"));
    expect(screen.getByRole("slider", { name: "수분감 최대" })).toHaveAttribute("aria-valuenow", "3");

    fireEvent.click(screen.getByText("없음"));
    expect(screen.getByRole("slider", { name: "수분감 최소" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("status")).toHaveTextContent("수분감 없음부터 높음까지");
  });

  it("막히면 키보드로 포커스할 수 없고 값을 바꾸지 않는다", () => {
    const onValueChange = vi.fn();
    render(
      <RangeSlider
        label="수분감"
        steps={STEPS}
        value={[0, 3]}
        onValueChange={onValueChange}
        tone="moisture"
        disabled
      />,
    );
    const low = screen.getByRole("slider", { name: "수분감 최소" });

    expect(low).toHaveAttribute("tabindex", "-1");
    expect(low).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(low, { key: "ArrowRight" });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Slider", () => {
  it("방향키는 0.5 씩, Home/End 는 양 끝으로 옮긴다", () => {
    function Sample() {
      const [value, setValue] = useState(2.5);
      return <Slider label="수분감" value={value} onValueChange={setValue} tone="moisture" />;
    }
    render(<Sample />);
    const slider = screen.getByRole("slider", { name: "수분감" });

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuetext", "3");

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "3");

    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider).toHaveAttribute("aria-valuetext", "0");

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuetext", "0.5");
  });

  describe("고르기 전(null)", () => {
    function Sample({ onValueChange }: { readonly onValueChange?: (value: number) => void }) {
      const [value, setValue] = useState<number | null>(null);
      return (
        <Slider
          label="수분감"
          value={value}
          onValueChange={(next) => {
            onValueChange?.(next);
            setValue(next);
          }}
          tone="moisture"
        />
      );
    }

    it("값 자리를 비우고 손잡이를 그리지 않으며, 보조 기술에는 값 없이 '선택 전'으로 알린다", () => {
      const { container } = render(<Sample />);
      const slider = screen.getByRole("slider", { name: "수분감" });

      expect(screen.queryByText("선택 전")).not.toBeInTheDocument();
      expect(slider).toHaveAttribute("aria-valuetext", "선택 전");
      expect(slider).not.toHaveAttribute("aria-valuenow");
      expect(container.querySelector("[data-focus-ring]")).toBeNull();
    });

    it("→ 는 min 에서 한 단위 옮긴 값으로 정하고, 그 뒤로는 손잡이를 그린다", () => {
      const onValueChange = vi.fn();
      const { container } = render(<Sample onValueChange={onValueChange} />);
      const slider = screen.getByRole("slider", { name: "수분감" });

      fireEvent.keyDown(slider, { key: "ArrowRight" });

      expect(onValueChange).toHaveBeenCalledWith(0.5);
      expect(slider).toHaveAttribute("aria-valuenow", "0.5");
      expect(screen.queryByText("선택 전")).not.toBeInTheDocument();
      expect(container.querySelector("[data-focus-ring]")).not.toBeNull();
    });

    it("← 와 Home 은 min, End 는 max 로 정한다", () => {
      const cases = [
        ["ArrowLeft", 0],
        ["Home", 0],
        ["End", 3],
      ] as const;
      for (const [key, expected] of cases) {
        const onValueChange = vi.fn();
        const { unmount } = render(<Sample onValueChange={onValueChange} />);
        fireEvent.keyDown(screen.getByRole("slider", { name: "수분감" }), { key });
        expect(onValueChange).toHaveBeenCalledWith(expected);
        unmount();
      }
    });

    it("트랙을 누르면 누른 자리의 단계로 정한다", () => {
      const onValueChange = vi.fn();
      render(<Sample onValueChange={onValueChange} />);
      const slider = screen.getByRole("slider", { name: "수분감" });
      const area = slider.parentElement as HTMLElement;
      area.getBoundingClientRect = () => ({
        left: 0,
        width: 300,
        top: 0,
        height: 28,
        right: 300,
        bottom: 28,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      fireEvent.pointerDown(area, { button: 0, pointerId: 1, clientX: 200 });

      expect(onValueChange).toHaveBeenCalledWith(2);
      expect(slider).toHaveAttribute("aria-valuetext", "2");
    });
  });
});

describe("Slider 글 바꾸기", () => {
  it("값 줄 · 보조 기술 · 눈금 아래 글을 넘긴 함수로 적는다", () => {
    render(
      <Slider
        label="수분감"
        value={1.5}
        onValueChange={() => undefined}
        tone="moisture"
        formatValue={(value) => (value === 1.5 ? "낮음~보통" : String(value))}
        formatMark={(mark) => ["없음", "낮음", "보통", "높음"][mark] ?? ""}
      />,
    );

    expect(screen.getByText("낮음~보통")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "수분감" })).toHaveAttribute("aria-valuetext", "낮음~보통");
    expect(["없음", "낮음", "보통", "높음"].map((name) => screen.getByText(name))).toHaveLength(4);
  });
});

describe("선택 햅틱", () => {
  it("범위 슬라이더는 단계가 바뀔 때만 떨고, 범위가 그대로면 떨지 않는다", () => {
    vi.mocked(requestSelectionHaptic).mockClear();
    function Sample() {
      const [value, setValue] = useState<readonly [number, number]>([0, 2]);
      return (
        <RangeSlider
          label="수분감"
          steps={["없음", "낮음", "보통", "높음"]}
          value={value}
          onValueChange={setValue}
          tone="moisture"
        />
      );
    }
    render(<Sample />);
    const low = screen.getByRole("slider", { name: "수분감 최소" });

    fireEvent.keyDown(low, { key: "Home" });
    expect(requestSelectionHaptic).not.toHaveBeenCalled();

    fireEvent.keyDown(low, { key: "ArrowRight" });
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(1);
  });

  it("한 값 슬라이더는 단계가 바뀔 때만 떨고, 같은 단계면 떨지 않는다", () => {
    vi.mocked(requestSelectionHaptic).mockClear();
    function Sample() {
      const [value, setValue] = useState<number | null>(3);
      return <Slider label="수분감" value={value} onValueChange={setValue} tone="moisture" />;
    }
    render(<Sample />);
    const slider = screen.getByRole("slider", { name: "수분감" });

    fireEvent.keyDown(slider, { key: "End" });
    expect(requestSelectionHaptic).not.toHaveBeenCalled();

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(1);
  });
});
