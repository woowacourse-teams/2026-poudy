import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { LoadMore } from "./load-more";

const meta = {
  title: "피드백/LoadMore",
  component: LoadMore,
} satisfies Meta<typeof LoadMore>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof LoadMore>;

function PreviousSample() {
  const [status, setStatus] = useState<"idle" | "loading" | "failed">("idle");

  return (
    <LoadMore
      direction="previous"
      status={status}
      onLoad={() => {
        setStatus("loading");
        setTimeout(() => setStatus("failed"), 1200);
      }}
    />
  );
}

export const Previous: Story = {
  name: "이전 제품 보기 (누르면 불러오는 중 → 실패)",
  render: () => <PreviousSample />,
};

export const Next: Story = {
  name: "다음 장 (불러오는 중 · 마지막 · 실패)",
  render: () => (
    <>
      <LoadMore
        direction="next"
        status="loading"
        loadedCount={4}
        totalCount={350}
        onLoad={() => {}}
        onRetry={() => {}}
      />
      <LoadMore direction="next" status="end" loadedCount={350} totalCount={350} onLoad={() => {}} onRetry={() => {}} />
      <LoadMore
        direction="next"
        status="failed"
        loadedCount={20}
        totalCount={350}
        onLoad={() => {}}
        onRetry={() => {}}
      />
    </>
  ),
};
