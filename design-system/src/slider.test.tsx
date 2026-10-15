/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RangeSlider } from "./range-slider";
import { Slider } from "./slider";

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
});
