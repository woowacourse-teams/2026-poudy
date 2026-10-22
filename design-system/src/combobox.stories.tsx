import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

import { Combobox, ComboboxGroup, ComboboxInput, ComboboxList, ComboboxOption } from "./combobox";

const PRODUCTS = [
  "독도 토너",
  "독도 로션",
  "독도 클렌저",
  "자작나무 수분 크림",
  "약콩 영양 크림",
  "1025 독도 토너 패드",
];

const meta = {
  title: "입력/Combobox",
  component: Combobox,
} satisfies Meta<typeof Combobox>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof Combobox>;

function ComboboxSample() {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>();

  const results = query.trim() ? PRODUCTS.filter((name) => name.includes(query.trim())) : [];

  return (
    <>
      <Combobox
        value={query}
        onChange={setQuery}
        open={results.length > 0}
        status={query.trim() ? `${query.trim()} 결과 ${results.length}개` : undefined}
      >
        <ComboboxInput
          label="제품명 검색"
          placeholder="'독도'를 입력해 보세요"
          onSubmit={() => setPicked(`'${query}' 검색`)}
        />
        <ComboboxList label="제품 자동완성" className="pt-1 pb-4">
          <ComboboxOption onSelect={() => setPicked(`'${query}' 검색`)}>
            <span className="flex h-12 items-center border-b border-border px-1 text-body font-bold text-text-primary">
              ‘{query.trim()}’가 포함된 제품 검색
            </span>
          </ComboboxOption>
          <ComboboxGroup
            label={<span className="block px-1 pt-6 pb-1 text-caption text-text-secondary">제품 바로가기</span>}
          >
            {results.map((name) => (
              <ComboboxOption key={name} onSelect={() => setPicked(name)}>
                <span className="flex h-12 items-center px-1 text-body text-text-primary">{name}</span>
              </ComboboxOption>
            ))}
          </ComboboxGroup>
        </ComboboxList>
      </Combobox>
      <p className="text-caption text-text-secondary">고른 제품: {picked ?? "없음"}</p>
    </>
  );
}

export const Autocomplete: Story = {
  name: "자동완성 (↓·↑ 이동, Enter 고르기, Esc 닫기)",
  render: () => <ComboboxSample />,
  play: async ({ canvas, step, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "제품명 검색" });

    await step("입력하면 목록을 연다", async () => {
      await userEvent.type(input, "독도");
      await expect(input).toHaveAttribute("aria-expanded", "true");
      await expect(canvas.getAllByRole("option")).toHaveLength(5);
    });

    await step("↓ 로 후보를 가리키고, 가리킨 후보를 aria-activedescendant 로 알린다", async () => {
      await userEvent.keyboard("{ArrowDown}{ArrowDown}");
      const option = canvas.getByRole("option", { name: "독도 토너" });
      await expect(option).toHaveAttribute("aria-selected", "true");
      await expect(input).toHaveAttribute("aria-activedescendant", option.id);
    });

    await step("↑ 로 되돌아간다", async () => {
      await userEvent.keyboard("{ArrowUp}");
      await expect(canvas.getByRole("option", { name: "독도 토너" })).toHaveAttribute("aria-selected", "false");
    });

    await step("Enter 로 가리킨 후보를 고른다", async () => {
      await userEvent.keyboard("{ArrowDown}{Enter}");
      await expect(canvas.getByText("고른 제품: 독도 토너")).toBeVisible();
    });

    await step("Esc 로 목록을 닫는다. 입력한 글자는 그대로 둔다", async () => {
      await userEvent.keyboard("{Escape}");
      await expect(input).toHaveAttribute("aria-expanded", "false");
      await expect(input).toHaveValue("독도");
    });
  },
};
