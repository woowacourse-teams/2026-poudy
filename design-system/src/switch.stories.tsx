import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SwitchIndicator } from "./switch";

const meta = {
  title: "선택/SwitchIndicator",
  component: SwitchIndicator,
} satisfies Meta<typeof SwitchIndicator>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof SwitchIndicator>;

/** 누르는 영역은 행 전체다. 행이 role="switch" 를 맡는다. */
function SwitchRowSample({ tone }: { readonly tone: "action" | "brand" }) {
  const [checked, setChecked] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => setChecked(!checked)}
      className="flex min-h-11 w-80 items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-body font-semibold text-text-primary"
    >
      알림 받기
      <SwitchIndicator checked={checked} tone={tone} />
    </button>
  );
}

export const Default: Story = {
  name: "SwitchIndicator",
  render: () => (
    <div className="flex flex-col gap-3">
      <SwitchRowSample tone="action" />
      <SwitchRowSample tone="brand" />
    </div>
  ),
};
