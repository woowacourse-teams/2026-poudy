import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "./button";
import { Slider } from "./slider";

const meta = {
  title: "선택/Slider",
  component: Slider,
} satisfies Meta<typeof Slider>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Slider>;

function RatingSample() {
  const [rating, setRating] = useState(2.5);

  return (
    <Slider
      label="수분감"
      value={rating}
      onValueChange={setRating}
      tone="moisture"
      startLabel="건조해요"
      endLabel="촉촉해요"
    />
  );
}

function UnsetSample() {
  const [oilRating, setOilRating] = useState<number | null>(null);

  return (
    <>
      <Slider
        label="유분감"
        value={oilRating}
        onValueChange={setOilRating}
        tone="oil"
        startLabel="산뜻해요"
        endLabel="번들거려요"
      />
      <Button variant="text" className="self-start" onClick={() => setOilRating(null)}>
        선택 전으로 되돌리기 (견본용)
      </Button>
    </>
  );
}

export const Rating: Story = {
  name: "유수분 평가",
  render: () => <RatingSample />,
};

export const Unset: Story = {
  name: "선택 전 (value=null, 누르거나 방향키로 고름)",
  render: () => <UnsetSample />,
};
