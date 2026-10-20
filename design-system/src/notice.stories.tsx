import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "./button";
import { Notice } from "./notice";

const meta = {
  title: "피드백/Notice",
  component: Notice,
} satisfies Meta<typeof Notice>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Notice>;

function NoticeSample() {
  const [open, setOpen] = useState(true);

  return open ? (
    <Notice
      actions={[
        { label: "대신 리모넨 남기기", onClick: () => setOpen(false) },
        { label: "조건 보기", onClick: () => {} },
      ]}
      onClose={() => setOpen(false)}
    >
      링크 조건 중 ‘리모넨’은 ‘향료/알레르기 성분’ 피하기와 함께 쓸 수 없어서 뺐어요.
    </Notice>
  ) : (
    <Button variant="secondary" onClick={() => setOpen(true)}>
      안내 줄 다시 보기
    </Button>
  );
}

export const WithActions: Story = {
  name: "행동 2개 (✕ 로 닫을 때까지 남음)",
  render: () => <NoticeSample />,
};

export const Plain: Story = {
  name: "행동 없음",
  render: () => <Notice onClose={() => {}}>행동 없이 알리기만 하는 안내 줄이에요.</Notice>,
};
