import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import type { FieldRule } from "./field-rule";
import { TextArea } from "./text-area";

const contentRule: FieldRule = {
  validate: (value) => (value.trim().length === 0 ? "문의 내용을 적어 주세요." : undefined),
};

const meta = {
  title: "입력/TextArea",
  component: TextArea,
} satisfies Meta<typeof TextArea>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof TextArea>;

function TextAreaSample() {
  const [content, setContent] = useState("");

  return (
    <TextArea
      label="문의 내용"
      value={content}
      onChange={setContent}
      placeholder={"예를 들어 어느 화면에서 무엇을 누르셨는지\n적어 주시면 도움이 돼요."}
      maxLength={2000}
      rule={contentRule}
    />
  );
}

export const Default: Story = {
  name: "기본 (글자 수 제한과 검사)",
  render: () => <TextAreaSample />,
};
