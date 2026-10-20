import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { Button } from "./button";
import { ToastProvider, useToast } from "./toast";

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
    </div>
  );
}

export const Default: Story = {
  name: "정보 · 되돌리기 (아래에 떠서 4초 뒤 사라짐)",
  render: () => <ToastSamples />,
};
