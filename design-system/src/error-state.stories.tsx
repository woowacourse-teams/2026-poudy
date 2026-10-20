import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { ErrorState } from "./error-state";
import { Icon } from "./icon";

const meta = {
  title: "피드백/ErrorState",
  component: ErrorState,
} satisfies Meta<typeof ErrorState>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof ErrorState>;

export const Screen: Story = {
  name: "screen (S51)",
  render: () => (
    <ErrorState
      variant="screen"
      icon={<Icon name="alert-circle" size={28} />}
      title="화면이 잠깐 삐끗했어요"
      description={"얼른 바로잡고 있어요.\n잠시 후 다시 시도해 주세요."}
      action={<Button variant="secondary">다시 시도</Button>}
      code="7f3a9c"
    />
  ),
};

export const Section: Story = {
  name: "section (S51a)",
  render: () => (
    <ErrorState variant="section" onRetry={() => {}}>
      제품을 불러오지 못했어요
    </ErrorState>
  ),
};
