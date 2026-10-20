import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SearchField } from "./search-field";

const meta = {
  title: "입력/SearchField",
  component: SearchField,
} satisfies Meta<typeof SearchField>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof SearchField>;

function SearchFieldSamples() {
  const [keyword, setKeyword] = useState("");

  return (
    <>
      <SearchField
        value={keyword}
        onChange={setKeyword}
        label="제품명 검색"
        placeholder="브랜드 또는 제품명을 입력해 주세요"
      />
      <SearchField value="독도" onChange={() => undefined} label="값이 있는 검색" placeholder="" />
    </>
  );
}

export const States: Story = {
  name: "평소 · 값이 있을 때",
  render: () => <SearchFieldSamples />,
};
