import type { Meta, StoryObj } from "@storybook/react-vite";

import { Frame } from "../.storybook/frame";
import { TopBar } from "./top-bar";

const noop = () => undefined;

const meta = {
  title: "화면 골격/TopBar",
  component: TopBar,
} satisfies Meta<typeof TopBar>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof TopBar>;

export const Sub: Story = {
  name: "sub (하위 화면)",
  render: () => (
    <>
      <Frame>
        <TopBar variant="sub" title="탐색 조건 설정" back={{ onClick: noop }} />
      </Frame>
      <Frame>
        <TopBar
          variant="sub"
          title="탐색 조건 설정"
          back={{ onClick: noop }}
          action={{ text: "초기화", onClick: noop }}
        />
      </Frame>
      <Frame>
        <TopBar
          variant="sub"
          title="성분 설명"
          back={{ asChild: <a href="#home" />, label: "홈으로" }}
          action={{ icon: "share", label: "나이아신아마이드 공유", onClick: noop }}
        />
      </Frame>
    </>
  ),
};

export const Explore: Story = {
  name: "explore (탐색 앱바 56)",
  render: () => (
    <>
      <Frame>
        <TopBar variant="explore" align="start" title="스킨케어" back={{ onClick: noop }} />
      </Frame>
      <Frame>
        <TopBar variant="explore" align="center" title="라운드랩" back={{ onClick: noop }} />
      </Frame>
    </>
  ),
};

export const Large: Story = {
  name: "large (탭 첫 화면)",
  render: () => (
    <>
      <Frame>
        <TopBar
          variant="large"
          title="선반"
          actions={[
            { icon: "help-circle", label: "선반 설명 보기", onClick: noop, haspopup: "dialog" },
            { icon: "plus", label: "제품 추가", onClick: noop },
          ]}
        />
      </Frame>
      <Frame>
        <TopBar variant="large" title="카테고리" />
      </Frame>
    </>
  ),
};
