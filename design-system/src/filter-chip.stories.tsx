import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { FilterChip, FilterResetChip, FilterToggleChip } from "./filter-chip";

const meta = {
  title: "칩과 태그/FilterChip",
  component: FilterChip,
} satisfies Meta<typeof FilterChip>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof FilterChip>;

function FilterChipSamples() {
  const [open, setOpen] = useState<string>();
  const [mine, setMine] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterResetChip onReset={() => setOpen(undefined)} />
      <FilterToggleChip label="나만의 필터" icon="user-check" pressed={mine} onPress={() => setMine(!mine)} />
      <FilterChip
        label="성분"
        expanded={open === "성분"}
        onOpen={() => setOpen(open === "성분" ? undefined : "성분")}
      />
      <FilterChip label="피부 타입" value="건성" expanded={false} onOpen={() => undefined} />
      <FilterChip label="브랜드" value="닥터지 외 2개" expanded={false} onOpen={() => undefined} />
    </div>
  );
}

export const Default: Story = {
  name: "FilterChip · FilterResetChip · FilterToggleChip",
  render: () => <FilterChipSamples />,
};
