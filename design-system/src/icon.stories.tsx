import type { Meta, StoryObj } from "@storybook/react-vite";

import { Icon, ICON_NAMES, ICON_SIZES } from "./icon";

const meta = {
  title: "화면 골격/Icon",
  component: Icon,
} satisfies Meta<typeof Icon>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Icon>;

export const Sizes: Story = {
  name: "크기 단계 (12 · 14 · 16 · 20 · 24 · 28 · 40)",
  render: () => (
    <div className="flex items-end gap-3 text-text-primary">
      {ICON_SIZES.map((size) => (
        <Icon key={size} name="search" size={size} />
      ))}
    </div>
  ),
};

export const All: Story = {
  name: "전체 아이콘",
  render: () => (
    <div className="flex flex-wrap gap-3 text-text-secondary">
      {ICON_NAMES.map((name) => (
        <Icon key={name} name={name} size={24} />
      ))}
    </div>
  ),
};

export const Scalable: Story = {
  name: "scalable (브라우저 글자 크기를 따라 커짐)",
  render: () => (
    <div className="flex items-center gap-1 text-body text-text-primary">
      전성분 보기
      <Icon name="chevron-right" size={16} scalable />
    </div>
  ),
};

export const Filled: Story = {
  name: "filled (켜진 상태)",
  render: () => (
    <div className="flex gap-3 text-brand-strong">
      {(["home", "grid", "search", "archive", "user", "bookmark", "bookmarks"] as const).map((name) => (
        <Icon key={name} name={name} size={24} filled />
      ))}
    </div>
  ),
};
