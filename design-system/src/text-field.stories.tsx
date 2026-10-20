import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

import type { FieldRule } from "./field-rule";
import { TextField } from "./text-field";

const productNameRule: FieldRule = {
  validate: (value) => (value.trim().length < 2 ? "제품명을 2자 이상 적어 주세요." : undefined),
};

const nicknameRule: FieldRule = {
  validate: (value) => (value.includes(" ") ? "띄어쓰기 없이 적어 주세요." : undefined),
  validateOn: "change",
  debounceMs: 500,
};

const meta = {
  title: "입력/TextField",
  component: TextField,
} satisfies Meta<typeof TextField>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof TextField>;

function TextFieldSamples() {
  const [productName, setProductName] = useState("");
  const [nickname, setNickname] = useState("");
  const [filled, setFilled] = useState("1025 독도 토너");

  return (
    <>
      <TextField
        label="제품명"
        value={productName}
        onChange={setProductName}
        placeholder="입력해 주세요"
        hint="용량이나 버전이 있다면 함께 적어 주세요."
        rule={productNameRule}
      />
      <TextField label="값이 있는 칸" value={filled} onChange={setFilled} placeholder="입력해 주세요" />
      <TextField
        label="닉네임 (입력이 멈추면 검사)"
        value={nickname}
        onChange={setNickname}
        placeholder="입력해 주세요"
        optional
        rule={nicknameRule}
      />
      <TextField
        label="서버 오류"
        value="중복된 이름"
        onChange={() => undefined}
        serverError="이미 등록된 제품이에요."
      />
      <TextField label="비활성" value="" onChange={() => undefined} placeholder="입력할 수 없어요" disabled />
    </>
  );
}

export const States: Story = {
  name: "상태",
  render: () => <TextFieldSamples />,
  // FEEDBACK F06. 손대지 않은 칸은 지나가도 조용하고, 입력한 뒤 벗어나면 오류를 띄우며, 고치면 바로 지운다.
  play: async ({ canvas, step, userEvent }) => {
    const field = canvas.getByRole("textbox", { name: /제품명/ });

    await step("손대지 않고 지나가면 오류가 없다", async () => {
      await userEvent.click(field);
      await userEvent.tab();
      await expect(field).not.toHaveAttribute("aria-invalid");
    });

    await step("한 글자만 적고 벗어나면 오류를 띄운다", async () => {
      await userEvent.type(field, "독");
      await userEvent.tab();
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(canvas.getByText("제품명을 2자 이상 적어 주세요.")).toBeVisible();
    });

    await step("고치면 칸을 벗어나지 않아도 바로 지운다", async () => {
      await userEvent.type(field, "도");
      await expect(field).not.toHaveAttribute("aria-invalid");
      await expect(canvas.queryByText("제품명을 2자 이상 적어 주세요.")).toBeNull();
    });
  },
};
