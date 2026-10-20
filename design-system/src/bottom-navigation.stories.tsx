import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Frame } from "../.storybook/frame";
import { BottomNavigation } from "./bottom-navigation";
import type { BottomNavigationItem } from "./bottom-navigation";

/* 앱의 탭 구성(client 의 BOTTOM_NAVIGATION_TABS)과 같게 둔 견본. 주소는 Storybook 안에서 움직이지 않게 # 으로 둔다. */
const SAMPLE_TABS = [
  { key: "home", label: "홈", icon: "home", href: "#home" },
  { key: "category", label: "카테고리", icon: "grid", href: "#category" },
  { key: "explore", label: "탐색", icon: "search", href: "#explore" },
  { key: "shelf", label: "선반", icon: "archive", href: "#shelf" },
  { key: "my", label: "마이", icon: "user", href: "#my" },
] as const satisfies readonly BottomNavigationItem[];
type SampleTab = (typeof SAMPLE_TABS)[number]["key"];

const meta = {
  title: "화면 골격/BottomNavigation",
  component: BottomNavigation,
} satisfies Meta<typeof BottomNavigation>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof BottomNavigation>;

function BottomNavigationSample() {
  const [tab, setTab] = useState<SampleTab>("home");

  return (
    <Frame>
      <BottomNavigation items={SAMPLE_TABS} current={tab} onSelect={setTab} />
    </Frame>
  );
}

export const Default: Story = {
  name: "5칸",
  render: () => <BottomNavigationSample />,
};
