import type { Meta, StoryObj } from "@storybook/react-vite";

import { Icon } from "./icon";
import { IconButton } from "./icon-button";

const meta = {
  title: "버튼/IconButton",
  component: IconButton,
  args: { label: "닫기", icon: <Icon name="x" size={24} /> },
  argTypes: { icon: { control: false } },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 변형과 크기를 Controls 에서 바꿔 본다. */
export const Playground: Story = {};

export const Variants: Story = {
  name: "변형 (ghost · overlay · thumbnail-remove)",
  render: () => (
    <div className="flex items-center gap-4">
      <IconButton label="닫기" icon={<Icon name="x" size={24} />} />
      <IconButton label="공유" icon={<Icon name="share" size={24} />} />
      <div className="rounded-lg bg-surface-inverse p-2">
        <IconButton variant="overlay" label="다음 사진" icon={<Icon name="chevron-right" size={20} />} />
      </div>
      <div className="relative size-18 rounded-sm bg-surface">
        <IconButton
          variant="thumbnail-remove"
          label="사진 삭제"
          icon={<Icon name="x" size={14} />}
          className="absolute -top-2.5 -right-2.5"
        />
      </div>
    </div>
  ),
};
