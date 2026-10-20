import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

import { press } from "../.storybook/play";
import { Button } from "./button";
import { MAX_TOASTS, TOAST_DURATION_MS, ToastProvider, useToast } from "./toast";

const meta = {
  title: "피드백/Toast",
  component: ToastProvider,
} satisfies Meta<typeof ToastProvider>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof ToastProvider>;

/** ToastProvider 는 .storybook/preview.tsx 가 앱처럼 한 번 둔다. */
function ToastSamples() {
  const toast = useToast();
  const actionRef = useRef<HTMLButtonElement>(null);
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => toast.show({ message: "레티놀은 ‘레티놀·레티노이드 6종’에 들어 있어 하나로 합쳤어요" })}
      >
        정보 토스트
      </Button>
      <Button
        ref={actionRef}
        variant="secondary"
        onClick={() => {
          const id = count + 1;
          setCount(id);
          toast.show({
            message: `제품 ${id}을 위시리스트에서 뺐어요`,
            action: { label: "되돌리기", onClick: () => setCount(id - 1), returnFocusTo: actionRef },
          });
        }}
      >
        되돌리기 토스트
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          [
            "나이아신아마이드를 피하는 조건에 넣었어요",
            "판테놀을 피하는 조건에 넣었어요",
            "향료를 피하는 조건에 넣었어요",
          ].forEach((message, index) => setTimeout(() => toast.show({ message }), index * 300))
        }
      >
        연달아 3개
      </Button>
      <p className="w-full text-caption text-text-secondary">
        최대 3개까지 쌓입니다. 마우스를 올리거나 포커스를 옮기거나 터치로 누르면 펼쳐지고, 그동안은 시간이 멈춥니다.
      </p>
    </div>
  );
}

export const Default: Story = {
  name: "정보 · 되돌리기 · 쌓기 (아래에 떠서 4초 뒤 사라짐)",
  render: () => <ToastSamples />,
  // 시간 규칙의 세부(토스트마다 따로 재기, 포커스·탭 숨김에서 멈춤)는 가짜 시계를 쓰는 toast.test.tsx 가 본다.
  // 여기서는 실제 브라우저와 실제 시계로 쌓이고, 펼치고, 멈췄다 사라지는지 본다.
  play: async ({ canvas, step, userEvent }) => {
    const openToasts = () => document.querySelectorAll('[data-toast][data-state="open"]');

    await step(`연달아 띄우면 ${MAX_TOASTS}개까지 쌓는다`, async () => {
      await press(userEvent, canvas.getByRole("button", { name: "연달아 3개" }));
      await waitFor(() => expect(openToasts()).toHaveLength(3));
      await press(userEvent, canvas.getByRole("button", { name: "정보 토스트" }));
      await waitFor(() => expect(openToasts()).toHaveLength(MAX_TOASTS));
      // 넘친 가장 오래된 토스트는 사라지는 전환이 끝나면 빠진다.
      await waitFor(() => expect(screen.queryByText("나이아신아마이드를 피하는 조건에 넣었어요")).toBeNull());
    });

    // 묶음 자체는 누름을 통과시키고(pointer-events: none), 토스트만 받는다. 맨 앞 토스트에 올린다.
    const stack = document.querySelector<HTMLElement>("[data-toaster]")!;
    const front = [...stack.querySelectorAll<HTMLElement>('[data-toast][data-state="open"]')].at(-1)!;

    await step("마우스를 올리면 펼친다", async () => {
      await userEvent.hover(front);
      await expect(stack).toHaveAttribute("data-expanded");
    });

    await step(`펼친 동안에는 ${TOAST_DURATION_MS / 1000}초가 지나도 사라지지 않는다`, async () => {
      await new Promise((resolve) => setTimeout(resolve, TOAST_DURATION_MS + 500));
      await expect(openToasts()).toHaveLength(MAX_TOASTS);
    });

    await step("떠나면 접고, 남은 시간이 지나면 모두 사라진다", async () => {
      await userEvent.unhover(front);
      await expect(stack).not.toHaveAttribute("data-expanded");
      await waitFor(() => expect(document.querySelectorAll("[data-toast]")).toHaveLength(0), {
        timeout: TOAST_DURATION_MS + 2000,
      });
    });
  },
};
