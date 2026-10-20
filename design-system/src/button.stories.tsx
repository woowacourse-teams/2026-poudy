import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { Icon } from "./icon";

const meta = {
  title: "버튼/Button",
  component: Button,
  args: { children: "제품 보기" },
  argTypes: {
    leadingIcon: { control: false },
    trailingIcon: { control: false },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 변형과 크기를 Controls 에서 바꿔 본다. */
export const Playground: Story = {};

export const Large: Story = {
  name: "크기 lg (화면 아래 고정 CTA)",
  render: () => (
    <>
      <Button size="lg">다음</Button>
      <Button size="lg" variant="destructive">
        탈퇴하기
      </Button>
      <Button size="lg" aria-disabled="true" aria-describedby="sample-reason">
        다음
      </Button>
      <p id="sample-reason" className="text-caption text-text-secondary">
        필수 항목을 모두 골라 주세요.
      </p>
    </>
  ),
};

export const Medium: Story = {
  name: "크기 md (본문·시트)",
  render: () => (
    <>
      <Button>제품 보기</Button>
      <Button variant="secondary">초기화</Button>
      <Button variant="destructive">삭제</Button>
      <Button trailingIcon={<Icon name="chevron-right" size={16} />}>더 보기</Button>
      <Button variant="secondary" leadingIcon={<Icon name="share" size={16} />}>
        공유하기
      </Button>
      <Button disabled>저장</Button>
      <Button busy>저장하는 중</Button>
    </>
  ),
};

export const Outline: Story = {
  name: "outline (목록 행 오른쪽 보조 행동)",
  render: () => (
    <div className="flex gap-2">
      <Button variant="outline">추가</Button>
      <Button variant="outline">평가하기</Button>
    </div>
  ),
};

export const Text: Story = {
  name: "text (행 전체가 누르는 글자 버튼)",
  render: () => (
    <Button variant="text" trailingIcon={<Icon name="chevron-right" size={16} className="text-text-secondary" />}>
      문의하기
    </Button>
  ),
};
