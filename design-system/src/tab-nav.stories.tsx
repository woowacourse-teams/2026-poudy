import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { TabNav, TabNavItem } from "./tab-nav";

const MODES = [
  ["product", "제품명 검색"],
  ["ingredient", "성분 필터링"],
] as const;

const meta = {
  title: "탭과 펼침/TabNav",
  component: TabNav,
} satisfies Meta<typeof TabNav>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof TabNav>;

function TabNavSample() {
  const [mode, setMode] = useState("product");

  return (
    <TabNav aria-label="탐색 방식">
      {MODES.map(([value, label]) => (
        <TabNavItem key={value} current={mode === value}>
          <a
            href={`?mode=${value}`}
            onClick={(event) => {
              event.preventDefault();
              setMode(value);
            }}
          >
            {label}
          </a>
        </TabNavItem>
      ))}
    </TabNav>
  );
}

export const Default: Story = {
  name: "링크 탭 (견본은 <a> 로 흉내)",
  render: () => <TabNavSample />,
};
