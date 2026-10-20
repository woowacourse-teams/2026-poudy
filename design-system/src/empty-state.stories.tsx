import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Icon } from "./icon";

const meta = {
  title: "피드백/EmptyState",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof EmptyState>;

export const WithIcon: Story = {
  name: "아이콘 (S51d)",
  render: () => (
    <EmptyState
      icon={<Icon name="search" size={28} />}
      title="‘독도 세럼’과 맞는 제품이 없어요"
      description={"제품명 철자를 확인하거나,\n브랜드 이름만으로 다시 검색해 보세요."}
      action={<Button variant="secondary">다시 검색하기</Button>}
    />
  ),
};

export const WithImage: Story = {
  name: "그림 (S55d-1)",
  render: () => (
    <EmptyState
      image={<div className="size-42.5 rounded-full bg-surface" />}
      title="아직 위시리스트에 추가한 제품이 없어요"
      description={"제품 상세에서 위시리스트 추가 버튼을 누르면\n여기에서 모아 볼 수 있어요."}
      action={<Button variant="secondary">제품 둘러보기</Button>}
    />
  ),
};
