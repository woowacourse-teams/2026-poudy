import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Button } from "./button";
import { TopStrip } from "./top-strip";

const meta = {
  title: "화면 골격/TopStrip",
  component: TopStrip,
  parameters: { frame: "screen" },
} satisfies Meta<typeof TopStrip>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof TopStrip>;

const NOTICES = ["선반 기능이 새로 생겼어요", "찾는 제품이 없으면 등록을 요청해 주세요", "성분 설명이 더 쉬워졌어요"];

function NoticeSample() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % NOTICES.length), 3000);
    return () => clearInterval(timer);
  }, []);

  return open ? (
    <TopStrip
      label={`공지 알림, ${NOTICES.length}개`}
      tone="brand"
      icon="speakerphone"
      action={{ asChild: <a href="#notice" /> }}
      onClose={() => setOpen(false)}
      closeLabel="공지 알림 닫기"
    >
      {NOTICES[index]}
    </TopStrip>
  ) : (
    <Button variant="secondary" onClick={() => setOpen(true)}>
      공지 띠 다시 보기
    </Button>
  );
}

export const Notice: Story = {
  name: "공지 (brand · 3초마다 바뀜)",
  render: () => <NoticeSample />,
};

export const OpenInApp: Story = {
  name: "앱에서 열기 (neutral)",
  render: () => (
    <TopStrip
      label="앱에서 열기"
      tone="neutral"
      icon="device-mobile"
      action={{ onClick: () => {} }}
      onClose={() => {}}
      closeLabel="앱에서 열기 안내 닫기"
    >
      이 화면을 앱에서 열기
    </TopStrip>
  ),
};

export const Stacked: Story = {
  name: "함께 뜰 때 (앱에서 열기 위 · 공지 아래)",
  render: () => (
    <>
      <TopStrip
        label="앱에서 열기"
        tone="neutral"
        icon="device-mobile"
        action={{ onClick: () => {} }}
        onClose={() => {}}
        closeLabel="앱에서 열기 안내 닫기"
      >
        이 화면을 앱에서 열기
      </TopStrip>
      <TopStrip
        label="공지 알림, 1개"
        tone="brand"
        icon="speakerphone"
        action={{ asChild: <a href="#notice" /> }}
        onClose={() => {}}
        closeLabel="공지 알림 닫기"
      >
        수분감 · 유분감 표시가 바뀌었어요. 제품 상세에서 새 표시를 확인해 보세요
      </TopStrip>
    </>
  ),
};
