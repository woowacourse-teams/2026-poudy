import type { Meta, StoryObj } from "@storybook/react-vite";

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
};
