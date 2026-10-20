import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

import { press, settled } from "../.storybook/play";
import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "./bottom-sheet";
import { Button } from "./button";
import { ConfirmSheet } from "./confirm-sheet";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { TextField } from "./text-field";

const CATEGORIES = ["전체", "스킨/토너", "에센스/세럼", "크림", "로션", "미스트", "오일"];

const meta = {
  title: "시트/BottomSheet",
  component: BottomSheet,
} satisfies Meta<typeof BottomSheet>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof BottomSheet>;

function FilterSample() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("전체");
  const [draft, setDraft] = useState("전체");
  const [nestedConfirm, setNestedConfirm] = useState(false);
  const [log, setLog] = useState("");

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setDraft(category);
          setOpen(true);
        }}
      >
        필터 시트 열기
      </Button>
      <p className="text-caption text-text-secondary">
        고른 카테고리: {category} · 마지막 닫힘: {log || "없음"}
      </p>

      <BottomSheet
        open={open}
        onClose={(reason) => {
          setLog(reason);
          setOpen(false);
        }}
      >
        <BottomSheetHeader title="카테고리" onClose={() => setOpen(false)} />
        <BottomSheetBody>
          <RadioGroup aria-label="카테고리" variant="list" value={draft} onValueChange={setDraft}>
            {CATEGORIES.map((name) => (
              <RadioGroupItem key={name} value={name}>
                {name}
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </BottomSheetBody>
        <BottomSheetFooter
          secondary={{ label: "초기화", onClick: () => setNestedConfirm(true) }}
          primary={{
            label: "제품 보기",
            onClick: () => {
              setCategory(draft);
              setOpen(false);
            },
          }}
        />
      </BottomSheet>

      <ConfirmSheet
        open={nestedConfirm}
        title="고른 조건을 모두 지울까요?"
        description="카테고리 선택이 '전체'로 돌아가요."
        confirmLabel="지우기"
        tone="destructive"
        onCancel={() => setNestedConfirm(false)}
        onConfirm={() => {
          setDraft("전체");
          setNestedConfirm(false);
        }}
      />
    </>
  );
}

function StepSample() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"list" | "detail">("list");

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setStep("list");
          setOpen(true);
        }}
      >
        단계가 있는 시트 열기
      </Button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        {step === "list" ? (
          <>
            <BottomSheetHeader title="피하고 싶은 성분" onClose={() => setOpen(false)} />
            <BottomSheetBody className="pb-6">
              <Button variant="secondary" onClick={() => setStep("detail")} className="w-full">
                자주 피하는 성분이란?
              </Button>
            </BottomSheetBody>
          </>
        ) : (
          <>
            <BottomSheetHeader title="자주 피하는 성분이란?" onBack={() => setStep("list")} />
            <BottomSheetBody className="pb-6">
              <p className="text-body leading-relaxed text-text-body">
                {"민감한 피부에서 자극을 일으킨다고 자주 알려진 성분이에요. 향료, 에탄올, 일부 방부제가 여기에 들어요. ".repeat(
                  4,
                )}
              </p>
            </BottomSheetBody>
          </>
        )}
      </BottomSheet>
    </>
  );
}

function FormSample() {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        입력이 있는 시트 열기
      </Button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <BottomSheetHeader title="메모 남기기" onClose={() => setOpen(false)} />
        <BottomSheetBody>
          <p className="pb-4 text-body text-text-body">
            {"긴 안내 문구가 이어져 본문이 넘치면 본문만 스크롤해요. ".repeat(12)}
          </p>
          <TextField label="메모" value={memo} onChange={setMemo} placeholder="입력해 주세요" />
        </BottomSheetBody>
        <BottomSheetFooter
          primary={{
            label: "저장",
            onClick: () => setOpen(false),
            disabledReason: memo.trim() ? undefined : "메모를 적으면 저장할 수 있어요.",
          }}
        />
      </BottomSheet>
    </>
  );
}

export const Filter: Story = {
  name: "제목 + ✕, 시트 위 확인 시트",
  render: () => <FilterSample />,
  // 시트는 #overlay-root 에 그려지므로 canvas 가 아니라 screen 에서 찾는다.
  play: async ({ canvas, step, userEvent }) => {
    const opener = canvas.getByRole("button", { name: "필터 시트 열기" });

    await step("열면 제목에 포커스를 둔다", async () => {
      await press(userEvent, opener);
      const sheet = await screen.findByRole("dialog", { name: "카테고리" });
      await expect(sheet).toContainElement(document.activeElement as HTMLElement);
      await settled(sheet);
    });

    await step("시트 위에 확인 시트를 겹치면 Esc 는 맨 위 확인 시트만 닫는다", async () => {
      await press(userEvent, screen.getByRole("button", { name: "초기화" }));
      await settled(await screen.findByRole("dialog", { name: "고른 조건을 모두 지울까요?" }));
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
      await expect(screen.getByRole("dialog", { name: "카테고리" })).toBeVisible();
      await settled(document.body);
    });

    await step("고르고 하단 버튼을 누르면 반영하고 닫는다", async () => {
      await press(userEvent, screen.getByRole("radio", { name: "크림" }));
      await press(userEvent, screen.getByRole("button", { name: "제품 보기" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await expect(canvas.getByText(/고른 카테고리: 크림/)).toBeVisible();
      await expect(opener).toHaveFocus();
    });

    await step("Esc 로 닫으면 escape 까닭을 넘긴다", async () => {
      await press(userEvent, opener);
      await screen.findByRole("dialog", { name: "카테고리" });
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await expect(canvas.getByText(/마지막 닫힘: escape/)).toBeVisible();
    });
  },
};

export const Steps: Story = {
  name: "단계 (‹ 뒤로, 높이 전환)",
  render: () => <StepSample />,
};

export const Form: Story = {
  name: "입력 (키보드, 본문만 스크롤)",
  render: () => <FormSample />,
};
