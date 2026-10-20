import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

import { press, settled } from "../.storybook/play";
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
  // A11Y D02 · 시트 닫힘 규칙. 시트는 #overlay-root 에 그려지므로 canvas 가 아니라 screen 에서 찾는다.
  play: async ({ canvas, step, userEvent }) => {
    const opener = canvas.getByRole("button", { name: "확인 시트 열기" });
    const closed = () => waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await step("열면 첫 포커스는 취소 버튼이다", async () => {
      await press(userEvent, opener);
      const dialog = await screen.findByRole("dialog", { name: "선반에서 뺄까요?" });
      await expect(screen.getByRole("button", { name: "취소" })).toHaveFocus();
      await expect(dialog).toHaveAccessibleDescription("평가와 메모도 함께 지워져요.");
    });

    await step("Esc 는 취소와 같고, 닫히면 연 버튼으로 포커스를 돌려준다", async () => {
      await userEvent.keyboard("{Escape}");
      await closed();
      await expect(canvas.getByText("마지막 결과: 취소 (escape)")).toBeVisible();
      await expect(opener).toHaveFocus();
    });

    await step("딤을 누르면 backdrop 까닭으로 닫는다", async () => {
      await press(userEvent, opener);
      const dialog = await screen.findByRole("dialog");
      await settled(dialog);
      await press(userEvent, dialog.previousElementSibling as HTMLElement);
      await closed();
      await expect(canvas.getByText("마지막 결과: 취소 (backdrop)")).toBeVisible();
    });

    await step("실행 버튼을 누르면 onConfirm 을 부른다", async () => {
      await press(userEvent, opener);
      await settled(await screen.findByRole("dialog"));
      await press(userEvent, screen.getByRole("button", { name: "빼기" }));
      await closed();
      await expect(canvas.getByText("마지막 결과: 실행")).toBeVisible();
    });
  },
};
