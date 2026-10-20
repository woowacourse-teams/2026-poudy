import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { CheckboxGroup, CheckboxGroupItem } from "./checkbox-group";

const meta = {
  title: "선택/CheckboxGroup",
  component: CheckboxGroup,
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof CheckboxGroup>;

function CheckboxGroupSamples() {
  const [reasons, setReasons] = useState<readonly string[]>(["rarely"]);
  const [ingredients, setIngredients] = useState<readonly string[]>(["alcohol", "fragrance"]);

  return (
    <>
      <CheckboxGroup label="탈퇴 이유" optional value={reasons} onValueChange={setReasons}>
        <CheckboxGroupItem value="rarely">자주 쓰지 않아요</CheckboxGroupItem>
        <CheckboxGroupItem value="missing">찾는 제품이 없어요</CheckboxGroupItem>
        <CheckboxGroupItem value="etc">기타</CheckboxGroupItem>
      </CheckboxGroup>
      <CheckboxGroup aria-label="빠른 제외 필터에 넣을 성분" divided value={ingredients} onValueChange={setIngredients}>
        <CheckboxGroupItem value="alcohol" description="제품 2개에 있음">
          알코올
        </CheckboxGroupItem>
        <CheckboxGroupItem value="limonene" description="제품 3개에 있음">
          리모넨
        </CheckboxGroupItem>
        <CheckboxGroupItem value="fragrance" description="이미 필터에 있음" disabled>
          향료 (막힘)
        </CheckboxGroupItem>
      </CheckboxGroup>
    </>
  );
}

export const Default: Story = {
  name: "기본 · 보조 글자와 나눔선",
  render: () => <CheckboxGroupSamples />,
};
