import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton } from "./skeleton";

const meta = {
  title: "피드백/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Skeleton>;

/** 조건 일치 제품 목록의 첫 로딩 자리(S50a). 상품 목록 카드와 같은 높이, 사진 80. */
function ProductRowSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton shape="box" className="size-20" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton shape="line" size={13} className="w-14" />
        <Skeleton shape="line" size={15} className="w-full" />
        <Skeleton shape="line" size={13} className="w-37.5" />
      </div>
    </div>
  );
}

export const ProductList: Story = {
  name: "제품 목록 첫 로딩 (S50a)",
  render: () => (
    <div aria-busy="true" className="flex flex-col">
      <ProductRowSkeleton />
      <ProductRowSkeleton />
    </div>
  ),
};
