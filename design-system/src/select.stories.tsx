import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Select } from "./select";

const meta = {
  title: "입력/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Select>;

function SelectSamples() {
  const [brandOpen, setBrandOpen] = useState(false);

  return (
    <>
      <Select
        label="브랜드"
        optional
        placeholder="선택해 주세요"
        expanded={brandOpen}
        onOpen={() => setBrandOpen((open) => !open)}
        hint="누르면 시트가 열린 것처럼 '입력 중' 모양이 된다(견본은 다시 누르면 닫힘)."
      />
      <Select label="고른 값" value="라운드랩" placeholder="선택해 주세요" expanded={false} onOpen={() => undefined} />
      <Select
        label="오류"
        placeholder="선택해 주세요"
        expanded={false}
        onOpen={() => undefined}
        error="브랜드를 골라 주세요."
      />
      <Select label="비활성" placeholder="선택해 주세요" expanded={false} onOpen={() => undefined} disabled />
    </>
  );
}

export const States: Story = {
  name: "상태",
  render: () => <SelectSamples />,
};
