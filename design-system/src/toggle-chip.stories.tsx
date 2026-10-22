import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ToggleChip, ToggleGroup } from "./toggle-chip";

const QUICK_FILTERS = ["자극성 방부제", "향료/알레르기 성분", "에탄올", "인공 색소"];

const meta = {
  title: "칩과 태그/ToggleChip",
  component: ToggleChip,
} satisfies Meta<typeof ToggleChip>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof ToggleChip>;

function QuickFilterSample() {
  const [quick, setQuick] = useState<readonly string[]>(["향료/알레르기 성분"]);

  return (
    <>
      <p id="quick-title" className="text-body font-bold text-text-primary">
        피하고 싶은 성분
      </p>
      <ToggleGroup aria-labelledby="quick-title">
        {QUICK_FILTERS.map((name) => (
          <ToggleChip
            key={name}
            pressed={quick.includes(name)}
            onPressedChange={(pressed) =>
              setQuick((current) => (pressed ? [...current, name] : current.filter((item) => item !== name)))
            }
          >
            {name}
          </ToggleChip>
        ))}
      </ToggleGroup>
    </>
  );
}

function AnySample() {
  const [any, setAny] = useState(false);

  return (
    <div className="flex items-center">
      <span className="flex-1 text-section font-bold text-text-primary">수분감</span>
      <ToggleChip size="sm" pressed={any} onPressedChange={setAny} aria-label="수분감 상관없음">
        상관없음
      </ToggleChip>
    </div>
  );
}

export const QuickFilter: Story = {
  name: "md · ToggleGroup (빠른 필터)",
  render: () => <QuickFilterSample />,
};

export const Small: Story = {
  name: "sm (범위 슬라이더 머리줄의 '상관없음')",
  render: () => <AnySample />,
};
