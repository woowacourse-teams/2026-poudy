import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Dropdown } from "./dropdown";

const meta = {
  title: "선택/Dropdown",
  component: Dropdown,
} satisfies Meta<typeof Dropdown>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Dropdown>;

function SortSample() {
  const [sort, setSort] = useState("DEFAULT");

  return (
    <div className="flex items-center justify-between">
      <span className="text-body-sm font-semibold text-text-secondary">총 350개</span>
      <Dropdown
        aria-label="정렬 기준"
        value={sort}
        onChange={setSort}
        options={[
          { value: "DEFAULT", label: "기본순" },
          { value: "PRICE_ASC", label: "가격 낮은순" },
          { value: "PRICE_DESC", label: "가격 높은순" },
          { value: "UNIT_PRICE_ASC", label: "용량별 가격 낮은순" },
          { value: "UNIT_PRICE_DESC", label: "용량별 가격 높은순" },
        ]}
      />
    </div>
  );
}

export const Sort: Story = {
  name: "목록 결과 헤더의 정렬",
  render: () => <SortSample />,
};
