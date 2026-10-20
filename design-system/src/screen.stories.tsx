import type { Meta, StoryObj } from "@storybook/react-vite";

import { BottomActionBar } from "./bottom-action-bar";
import { BottomNavigation } from "./bottom-navigation";
import type { BottomNavigationItem } from "./bottom-navigation";
import { Screen, ScreenBody } from "./screen";
import { TopBar } from "./top-bar";

const TABS = [
  { key: "home", label: "홈", icon: "home", href: "#home" },
  { key: "category", label: "카테고리", icon: "category", href: "#category" },
  { key: "explore", label: "탐색", icon: "search", href: "#explore" },
  { key: "shelf", label: "선반", icon: "archive", href: "#shelf" },
  { key: "my", label: "마이", icon: "user", href: "#my" },
] as const satisfies readonly BottomNavigationItem[];

const ROWS = Array.from({ length: 24 }, (_, index) => `본문 행 ${index + 1}`);
const noop = () => undefined;

const meta = {
  title: "화면 골격/Screen",
  component: Screen,
  // 화면 전체를 그리므로 본문 여백 없이(frame: screen), 문서에서는 높이를 정한 iframe 으로 그린다.
  parameters: { frame: "screen", layout: "fullscreen", docs: { story: { inline: false, height: "560px" } } },
} satisfies Meta<typeof Screen>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Screen>;

function Rows() {
  return (
    <ul className="flex flex-col px-gutter">
      {ROWS.map((row) => (
        <li key={row} className="flex h-12 items-center border-b border-border text-body text-text-body">
          {row}
        </li>
      ))}
    </ul>
  );
}

export const BodyWithNavigation: Story = {
  name: "body · 하단 내비 (본문만 스크롤)",
  render: () => (
    <Screen scroll="body">
      <TopBar variant="large" title="선반" />
      <ScreenBody>
        <Rows />
      </ScreenBody>
      <BottomNavigation items={TABS} current="shelf" />
    </Screen>
  ),
};

export const BodyWithAction: Story = {
  name: "body · 하단 행동 영역",
  render: () => (
    <Screen scroll="body">
      <TopBar variant="sub" title="탐색 조건 설정" back={{ onClick: noop }} />
      <ScreenBody>
        <Rows />
      </ScreenBody>
      <BottomActionBar position="screen-end" action={{ label: "472개 제품 보기", onClick: noop }} />
    </Screen>
  ),
};

export const Document: Story = {
  name: "document (문서 전체 스크롤)",
  render: () => (
    <Screen scroll="document">
      <TopBar variant="sub" title="성분 설명" back={{ onClick: noop }} />
      <ScreenBody>
        <Rows />
      </ScreenBody>
    </Screen>
  ),
};
