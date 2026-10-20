import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "./button";
import { ConfirmSheet } from "./confirm-sheet";

const meta = {
  title: "시트/ConfirmSheet",
  component: ConfirmSheet,
} satisfies Meta<typeof ConfirmSheet>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof ConfirmSheet>;

function DestructiveSample() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState("");

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        확인 시트 열기
      </Button>
      <p className="text-caption text-text-secondary">마지막 결과: {log || "없음"}</p>

      <ConfirmSheet
        open={open}
        title="선반에서 뺄까요?"
        description="평가와 메모도 함께 지워져요."
        confirmLabel="빼기"
        tone="destructive"
        onCancel={(reason) => {
          setLog(`취소 (${reason})`);
          setOpen(false);
        }}
        onConfirm={() => {
          setLog("실행");
          setOpen(false);
        }}
      >
        <div className="rounded-lg bg-surface p-4 text-body text-text-body">내용 칸(화면의 도메인 컴포넌트)</div>
      </ConfirmSheet>
    </>
  );
}

export const Destructive: Story = {
  name: "위험 (내용 칸 있음)",
  render: () => <DestructiveSample />,
};
