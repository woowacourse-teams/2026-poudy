import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

import { press } from "../.storybook/play";
import { Disclosure, DisclosureContent, DisclosureGroup, DisclosureIcon, DisclosureTrigger } from "./disclosure";

const CATEGORIES = { 스킨케어: ["스킨/토너", "에센스/세럼", "크림"], 클렌징: ["폼", "오일", "워터"] } as const;
const FAQ = [
  ["선반은 무엇인가요?", "써 본 제품을 모아 두고 잘 맞았는지 기록하는 곳이에요."],
  ["평가는 누가 볼 수 있나요?", "나만 볼 수 있어요. 다른 사람에게는 보이지 않아요."],
] as const;

const meta = {
  title: "탭과 펼침/Disclosure",
  component: DisclosureGroup,
} satisfies Meta<typeof DisclosureGroup>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof DisclosureGroup>;

export const Single: Story = {
  name: "DisclosureGroup · single (카테고리 시트 대분류)",
  render: () => (
    <DisclosureGroup type="single" defaultValue="스킨케어">
      {Object.entries(CATEGORIES).map(([group, items]) => (
        <Disclosure key={group} value={group}>
          <DisclosureTrigger>
            <button
              type="button"
              className="fb-surface flex h-12 w-full items-center justify-between rounded-md px-3 text-title font-semibold text-text-primary data-[state=open]:bg-surface"
            >
              {group}
              <DisclosureIcon />
            </button>
          </DisclosureTrigger>
          <DisclosureContent className="flex flex-col px-3 py-1">
            {items.map((item) => (
              <span key={item} className="flex h-11 items-center text-body text-text-body">
                {item}
              </span>
            ))}
          </DisclosureContent>
        </Disclosure>
      ))}
    </DisclosureGroup>
  ),
  play: async ({ canvas, step, userEvent }) => {
    const skincare = canvas.getByRole("button", { name: "스킨케어" });
    const cleansing = canvas.getByRole("button", { name: "클렌징" });

    await step("처음에는 기본값인 스킨케어만 펼쳐 있다", async () => {
      await expect(skincare).toHaveAttribute("aria-expanded", "true");
      await expect(cleansing).toHaveAttribute("aria-expanded", "false");
    });

    await step("하나를 펼치면 앞의 것을 접는다", async () => {
      await press(userEvent, cleansing);
      await expect(cleansing).toHaveAttribute("aria-expanded", "true");
      await expect(skincare).toHaveAttribute("aria-expanded", "false");
      // 내용은 fast(150ms) 동안 나타난다.
      await waitFor(() => expect(canvas.getByText("폼")).toBeVisible());
    });
  },
};

export const Multiple: Story = {
  name: "DisclosureGroup · multiple (자주 묻는 질문)",
  render: () => (
    <DisclosureGroup type="multiple">
      {FAQ.map(([question, answer]) => (
        <Disclosure key={question} value={question}>
          <DisclosureTrigger>
            <button
              type="button"
              className="fb-surface flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-title font-semibold text-text-primary"
            >
              {question}
              <DisclosureIcon />
            </button>
          </DisclosureTrigger>
          <DisclosureContent className="pb-3 text-body leading-relaxed text-text-secondary">{answer}</DisclosureContent>
        </Disclosure>
      ))}
    </DisclosureGroup>
  ),
  play: async ({ canvas, step, userEvent }) => {
    const [first, second] = FAQ.map(([question]) => canvas.getByRole("button", { name: question }));

    await step("따로 펼치고, 하나를 펼쳐도 다른 것은 그대로 둔다", async () => {
      await press(userEvent, first!);
      await press(userEvent, second!);
      await expect(first).toHaveAttribute("aria-expanded", "true");
      await expect(second).toHaveAttribute("aria-expanded", "true");
    });

    await step("다시 누르면 그것만 접는다", async () => {
      await press(userEvent, first!);
      await expect(first).toHaveAttribute("aria-expanded", "false");
      await expect(second).toHaveAttribute("aria-expanded", "true");
    });
  },
};
