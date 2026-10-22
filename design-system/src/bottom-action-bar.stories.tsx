import type { Meta, StoryObj } from "@storybook/react-vite";

import { Frame } from "../.storybook/frame";
import { BottomActionBar } from "./bottom-action-bar";

const noop = () => undefined;

const meta = {
  title: "화면 골격/BottomActionBar",
  component: BottomActionBar,
} satisfies Meta<typeof BottomActionBar>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof BottomActionBar>;

export const Positions: Story = {
  name: "하단 내비 위 · 화면 끝 · 비활성 안내 · 위험",
  render: () => (
    <>
      <Frame>
        <BottomActionBar position="above-nav" action={{ label: "472개 제품 보기", onClick: noop }} />
      </Frame>
      <Frame>
        <BottomActionBar
          position="screen-end"
          notice="문의 내용을 입력하면 접수할 수 있어요"
          action={{ label: "문의 접수하기", disabled: true, onClick: noop }}
        />
      </Frame>
      <Frame>
        <BottomActionBar position="screen-end" action={{ label: "탈퇴하기", tone: "destructive", onClick: noop }} />
      </Frame>
    </>
  ),
};
