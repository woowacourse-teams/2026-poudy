import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { RangeSlider } from "./range-slider";

const STEPS = ["없음", "낮음", "보통", "높음"];

const meta = {
  title: "선택/RangeSlider",
  component: RangeSlider,
} satisfies Meta<typeof RangeSlider>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof RangeSlider>;

function RangeSliderSamples() {
  const [moisture, setMoisture] = useState<readonly [number, number]>([1, 3]);
  const [oil, setOil] = useState<readonly [number, number]>([2, 2]);
  const [any, setAny] = useState(true);

  return (
    <>
      <RangeSlider label="수분감" steps={STEPS} value={moisture} onValueChange={setMoisture} tone="moisture" />
      <RangeSlider label="유분감 (겹침)" steps={STEPS} value={oil} onValueChange={setOil} tone="oil" />
      <label className="flex items-center gap-2 text-body text-text-primary">
        <input type="checkbox" checked={any} onChange={(event) => setAny(event.target.checked)} />
        상관없음 (견본용 스위치)
      </label>
      <RangeSlider
        label="수분감 (막힘)"
        steps={STEPS}
        value={moisture}
        onValueChange={setMoisture}
        tone="moisture"
        disabled={any}
      />
    </>
  );
}

export const Default: Story = {
  name: "기본 · 겹침 · 막힘 (머리줄은 화면이 그림)",
  render: () => <RangeSliderSamples />,
};
