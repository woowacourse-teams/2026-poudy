import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Icon } from "./icon";
import { Tag } from "./tag";

const LONG_NAME = "비스-베헤닐/아이소스테아릴/피토스테릴/옥틸도데실 라우로일 글루타메이트";

const meta = {
  title: "칩과 태그/Tag",
  component: Tag,
} satisfies Meta<typeof Tag>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Tag>;

function ItemSample() {
  const [chips, setChips] = useState(["나이아신아마이드", "판테놀", LONG_NAME, "향료/알레르기 성분"]);

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((name) => (
        <Tag key={name} variant="item" onRemove={() => setChips((current) => current.filter((item) => item !== name))}>
          {name}
        </Tag>
      ))}
    </div>
  );
}

export const Item: Story = {
  name: "item (선택 성분 칩, 길게 누르기·올려 두기로 전체 이름)",
  render: () => <ItemSample />,
};

export const ItemWithBadge: Story = {
  name: "item + badge (성분군 칩, 이름이 길면 이름만 줄고 배지는 남음)",
  render: () => (
    <div className="flex max-w-80 flex-col items-start gap-2">
      <Tag variant="item" badge="15종" onRemove={() => undefined} removeLabel="세라마이드 계열 15종 빼기">
        세라마이드 계열
      </Tag>
      <Tag variant="item" badge="24종" onRemove={() => undefined} removeLabel={`${LONG_NAME} 계열 24종 빼기`}>
        {`${LONG_NAME} 계열`}
      </Tag>
    </div>
  ),
};

export const Summary: Story = {
  name: "summary (적용 조건 칩)",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag variant="summary">나이아신아마이드</Tag>
      <Tag variant="summary">향료/알레르기 성분</Tag>
      <Tag variant="summary">{LONG_NAME}</Tag>
    </div>
  ),
};

export const Label: Story = {
  name: "label (효과 · 주의 · 기능 태그)",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag variant="label" tone="neutral" icon={<Icon name="share" size={14} />}>
        수분
      </Tag>
      <Tag variant="label" tone="caution">
        향료
      </Tag>
      <Tag variant="label" tone="info">
        보습
      </Tag>
      <Tag variant="label" tone="success">
        진정
      </Tag>
      <Tag variant="label" tone="warning">
        각질 케어
      </Tag>
      <Tag variant="label" tone="muted">
        일반
      </Tag>
      <Tag variant="label" tone="ai">
        피부 장벽
      </Tag>
    </div>
  ),
};
