import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";

const meta = {
  title: "칩과 태그/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Badge>;

export const Variants: Story = {
  name: "ai · rating",
  render: () => (
    <div className="flex items-center gap-3">
      <Badge variant="ai" />
      <Badge variant="rating" rating="good" />
      <Badge variant="rating" rating="bad" />
    </div>
  ),
};
